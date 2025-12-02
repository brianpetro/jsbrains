/**
 * @file default.js
 * @description Default vector adapters for SmartEntities and SmartCollections
 * Implements in-memory vector logic using the entity's `data.embeddings`.
 * Uses cosine similarity for nearest/furthest queries.
 */

import { EntitiesVectorAdapter, EntityVectorAdapter } from "./_adapter.js";
import { cos_sim } from 'smart-utils/cos_sim.js';
import { results_acc, furthest_acc } from "smart-utils/results_acc.js";
import { sort_by_score_ascending, sort_by_score_descending } from "smart-utils/sort_by_score.js";

/**
 * @class DefaultEntitiesVectorAdapter
 * @extends EntitiesVectorAdapter
 * @classdesc
 * Implements an in-memory vector store using entity data.
 * Stores embeddings in the item's `data.embeddings` keyed by `embed_model_key`.
 * Supports nearest/furthest queries and batch embedding via the collection's embed_model.
 */
export class DefaultEntitiesVectorAdapter extends EntitiesVectorAdapter {
  constructor(collection) {
    super(collection);
    /**
     * Prevents concurrency in process_embed_queue().
     * @type {boolean}
     * @private
     */
    this._is_processing_embed_queue = false;
    this._reset_embed_queue_stats();
  }

  /**
   * Find the nearest entities to the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score descending.
   */
  async nearest(vec, filter = {}) {
    if (!vec || !Array.isArray(vec)) {
      throw new Error("Invalid vector input to nearest()");
    }
    const {
      limit = 50, // TODO: default configured in settings
    } = filter;
    const nearest = this.collection.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc; // skip if no vec
        const result = { item, score: cos_sim(vec, item.vec) };
        results_acc(acc, result, limit); // update acc
        return acc;
      }, { min: 0, results: new Set() });
    return Array.from(nearest.results).sort(sort_by_score_descending);
  }

  /**
   * Find the furthest entities from the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score ascending (furthest).
   */
  async furthest(vec, filter = {}) {
    if (!vec || !Array.isArray(vec)) {
      throw new Error("Invalid vector input to furthest()");
    }
    const {
      limit = 50, // TODO: default configured in settings
    } = filter;
    const furthest = this.collection.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc; // skip if no vec
        const result = { item, score: cos_sim(vec, item.vec) };
        furthest_acc(acc, result, limit); // update acc
        return acc;
      }, { max: 0, results: new Set() });
    return Array.from(furthest.results).sort(sort_by_score_ascending);
  }

  /**
   * Embed a batch of entities.
   * @async
   * @param {Object[]} entities - Array of entity instances to embed.
   * @returns {Promise<void>}
   */
  async embed_batch(entities) {
    if (!this.collection.embed_model) {
      throw new Error('No embed_model found in collection for embedding');
    }
    // Prepare input and get embeddings from the model
    // Assuming each entity has a get_embed_input() method that sets `entity._embed_input`
    await Promise.all(entities.map(e => e.get_embed_input()));
    const embeddings = await this.collection.embed_model.embed_batch(entities);
    // Assign embeddings to entities
    embeddings.forEach((emb, i) => {
      const entity = entities[i];
      entity.vec = emb.vec;
      entity.data.last_embed = entity.data.last_read;
      if (emb.tokens !== undefined) entity.tokens = emb.tokens;
      entity.emit_event('item:embedded');
    });
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Prevents multiple concurrent runs by using `_is_processing_embed_queue`.
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    if (this._is_processing_embed_queue) {
      console.log("process_embed_queue is already running, skipping concurrent call.");
      return;
    }
    this._is_processing_embed_queue = true;
    // load the embed_model if not already loaded
    try {
      if(!this.collection.embed_model.is_loaded) {
        await this.collection.embed_model.load();
      }
    } catch (e) {
      this.collection.emit_event('embed_model:load_failed');
      this.notices?.show('Failed to load embed_model');
      return;
    }

    try {
      const datetime_start = Date.now();
      console.log(`Getting embed queue for ${this.collection.collection_key}...`);
      await new Promise(resolve => setTimeout(resolve, 1)); // allow event loop to breathe
      const embed_queue = this.collection.embed_queue;
      // Reset stats as in SmartEntities
      this._reset_embed_queue_stats();
      
      if (this.collection.embed_model_key === "None") {
        console.log(`Smart Connections: No active embedding model for ${this.collection.collection_key}, skipping embedding`);
        return;
      }

      if (!this.collection.embed_model) {
        console.log(`Smart Connections: No active embedding model for ${this.collection.collection_key}, skipping embedding`);
        return;
      }

      if (!embed_queue.length) {
        console.log(`Smart Connections: No items in ${this.collection.collection_key} embed queue`);
        return;
      }

      console.log(`Time spent getting embed queue: ${Date.now() - datetime_start}ms`);
      console.log(`Processing ${this.collection.collection_key} embed queue: ${embed_queue.length} items`);

      // Process in batches according to embed_model.batch_size
      for (let i = 0; i < embed_queue.length; i += this.collection.embed_model.batch_size) {
        if (this.is_queue_halted) {
          this.is_queue_halted = false; // reset halt after break
          break;
        }
        // Show progress notice every ~100 items
        this._show_embed_progress_notice(embed_queue.length);
        
        // Prepare input
        const batch = embed_queue.slice(i, i + this.collection.embed_model.batch_size);
        await Promise.all(batch.map(item => item.get_embed_input()));

        // Embed batch
        try {
          const start_time = Date.now();
          await this.embed_batch(batch);
          this.total_time += Date.now() - start_time;
        } catch (e) {
          if (e && e.message && e.message.includes("API key not set")) {
            this.halt_embed_queue_processing(`API key not set for ${this.collection.embed_model_key}\nPlease set the API key in the settings.`);
          }
          console.error(e);
          console.error(`Error processing ${this.collection.collection_key} embed queue: ` + JSON.stringify((e || {}), null, 2));
        }

        // Update hash and stats
        batch.forEach(item => {
          item.embed_hash = item.read_hash;
          item._queue_save = true;
        });
        this.embedded_total += batch.length;
        this.total_tokens += batch.reduce((acc, item) => acc + (item.tokens || 0), 0);


        // Process save queue every 1000 items
        if (this.embedded_total - this.last_save_total > 1000) {
          this.last_save_total = this.embedded_total;
          await this.collection.process_save_queue();
          if(this.collection.block_collection) {
            console.log(`Saving ${this.collection.block_collection.collection_key} block collection`);
            await this.collection.block_collection.process_save_queue();
          }
        }
      }

      // Show completion notice
      this._show_embed_completion_notice(embed_queue.length);
      await this.collection.process_save_queue();
      if(this.collection.block_collection) {
        await this.collection.block_collection.process_save_queue();
      }
    } finally {
      // Always clear the concurrency flag, even on errors or halts
      this._is_processing_embed_queue = false;
    }
  }

  get should_show_embed_progress_notice() {
    if((Date.now() - (this.last_notice_time ?? 0)) > 30000){
      return true;
    }
    return (this.embedded_total - this.last_notice_embedded_total) >= 100;
  }
  /**
   * Displays the embedding progress notice.
   * @private
   * @returns {void}
   */
  _show_embed_progress_notice(embed_queue_length) {
    if(embed_queue_length < 100) return; // return early if not enough items
    if (!this.should_show_embed_progress_notice) return;
    this.last_notice_time = Date.now();
    this.last_notice_embedded_total = this.embedded_total;
    this.collection.emit_event('embedding:progress_reported', {
      progress: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key
    });
    this.notices?.show('embedding_progress', {
      progress: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key
    });
  }

  /**
   * Displays the embedding completion notice.
   * @private
   * @returns {void}
   */
  _show_embed_completion_notice() {
    this.notices?.remove('embedding_progress');
    if(this.embedded_total > 100) {
      this.collection.emit_event('embedding:completed', {
        total_embeddings: this.embedded_total,
        tokens_per_second: this._calculate_embed_tokens_per_second(),
        model_name: this.collection.embed_model_key
      });
      this.notices?.show('embedding_complete', {
        total_embeddings: this.embedded_total,
        tokens_per_second: this._calculate_embed_tokens_per_second(),
        model_name: this.collection.embed_model_key
      });
    }
  }

  /**
   * Halts the embed queue processing.
   * @param {string|null} msg - Optional message.
   */
  halt_embed_queue_processing(msg=null) {
    this.is_queue_halted = true;
    console.log("Embed queue processing halted");
    this.notices?.remove('embedding_progress');
    this.collection.emit_event('embedding:paused', {
      progress: this.embedded_total,
      total: this.collection._embed_queue.length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key
    });
    this.notices?.show('embedding_paused', {
      progress: this.embedded_total,
      total: this.collection._embed_queue.length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key
    });
  }

  /**
   * Resumes the embed queue processing after a delay.
   * @param {number} [delay=0] - The delay in milliseconds before resuming.
   * @returns {void}
   */
  resume_embed_queue_processing(delay = 0) {
    console.log("resume_embed_queue_processing");
    this.notices?.remove('embedding_paused');
    setTimeout(() => {
      this.embedded_total = 0;
      this.process_embed_queue();
    }, delay);
  }

  /**
   * Calculates the number of tokens processed per second.
   * @private
   * @returns {number} Tokens per second.
   */
  _calculate_embed_tokens_per_second() {
    const elapsed_time = this.total_time / 1000;
    return Math.round(this.total_tokens / (elapsed_time || 1));
  }

  /**
   * Resets the statistics related to embed queue processing.
   * @private
   * @returns {void}
   */
  _reset_embed_queue_stats() {
    this.collection._embed_queue = [];
    this.embedded_total = 0;
    this.is_queue_halted = false;
    this.last_save_total = 0;
    this.last_notice_embedded_total = 0;
    this.total_tokens = 0;
    this.total_time = 0;
  }
  
  get notices() {
    return this.collection.env.notices;
  }
}


/**
 * @class DefaultEntityVectorAdapter
 * @extends EntityVectorAdapter
 * @classdesc
 * In-memory adapter for a single entity. Stores and retrieves vectors from item.data.
 */
export class DefaultEntityVectorAdapter extends EntityVectorAdapter {
  get data() {
    return this.item.data;
  }
  /**
   * Retrieve the current vector embedding for this entity.
   * @async
   * @returns {Promise<number[]|undefined>} The entity's vector or undefined if not set.
   */
  async get_vec() {
    return this.vec;
  }

  /**
   * Store/update the vector embedding for this entity.
   * @async
   * @param {number[]} vec - The vector to set.
   * @returns {Promise<void>}
   */
  async set_vec(vec) {
    this.vec = vec;
  }

  /**
   * Delete/remove the vector embedding for this entity.
   * @async
   * @returns {Promise<void>}
   */
  async delete_vec() {
    if (this.item.data?.embeddings?.[this.item.embed_model_key]) {
      delete this.item.data.embeddings[this.item.embed_model_key].vec;
    }
  }

  // adds synchronous get/set for vec
  get vec() {
    return this.item.data?.embeddings?.[this.item.embed_model_key]?.vec;
  }
  set vec(vec){
    if (!this.item.data.embeddings) {
      this.item.data.embeddings = {};
    }
    if (!this.item.data.embeddings[this.item.embed_model_key]) {
      this.item.data.embeddings[this.item.embed_model_key] = {};
    }
    this.item.data.embeddings[this.item.embed_model_key].vec = vec;
  }
}

export default {
  collection: DefaultEntitiesVectorAdapter,
  item: DefaultEntityVectorAdapter
};
