/**
 * @file default.js
 * @description Default vector adapters for SmartEntities and SmartCollections
 * Implements in-memory vector logic using the entity's `data.embeddings`.
 * Uses cosine similarity for nearest/furthest queries.
 */

import { EntitiesVectorAdapter, EntityVectorAdapter } from "./_adapter.js";
import { cos_sim } from "../cos_sim.js";
import { results_acc, furthest_acc } from "../top_acc.js";

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
    return Array.from(nearest.results);
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
    return Array.from(furthest.results);
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
      if (emb.tokens !== undefined) entity.tokens = emb.tokens;
    });
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Typically, this will call embed_batch in batches and update entities.
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
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

    const datetime_start = new Date();
    if (!embed_queue.length) {
      return console.log(`Smart Connections: No items in ${this.collection.collection_key} embed queue`);
    }

    console.log(`Time spent getting embed queue: ${(new Date()).getTime() - datetime_start.getTime()}ms`);
    console.log(`Processing ${this.collection.collection_key} embed queue: ${embed_queue.length} items`);

    // Process in batches according to embed_model.batch_size
    for (let i = 0; i < embed_queue.length; i += this.collection.embed_model.batch_size) {
      if (this.is_queue_halted) {
        this.is_queue_halted = false; // reset halt after break
        break;
      }
      const batch = embed_queue.slice(i, i + this.collection.embed_model.batch_size);

      // Prepare input
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
      });
      this.embedded_total += batch.length;
      this.total_tokens += batch.reduce((acc, item) => acc + (item.tokens || 0), 0);

      // Show progress notice every ~100 items
      this._show_embed_progress_notice(embed_queue.length);

      // Process save queue every 1000 items
      if (this.embedded_total - this.last_save_total > 1000) {
        this.last_save_total = this.embedded_total;
        await this.collection.process_save_queue();
        if(this.collection.block_collection) {
          await this.collection.block_collection.process_save_queue();
        }
      }
    }

    // Show completion notice
    this._show_embed_completion_notice(embed_queue.length);
    this.collection.process_save_queue();
    if(this.collection.block_collection) {
      await this.collection.block_collection.process_save_queue();
    }
  }

  /**
   * Displays the embedding progress notice.
   * @private
   * @returns {void}
   */
  _show_embed_progress_notice() {
    if (this.embedded_total - this.last_notice_embedded_total < 100) return;
    this.last_notice_embedded_total = this.embedded_total;
    const pause_btn = { text: "Pause", callback: this.halt_embed_queue_processing.bind(this), stay_open: true };
    this.notices?.show('embedding_progress',
      [
        `Making Smart Connections...`,
        `Embedding progress: ${this.embedded_total} / ${this.collection.embed_queue.length}`,
        `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.embed_model_key}`
      ],
      {
        timeout: 0,
        button: pause_btn
      }
    );
  }
  /**
   * Displays the embedding completion notice.
   * @private
   * @returns {void}
   */
  _show_embed_completion_notice() {
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_complete', [
      `Embedding complete.`,
      `${this.embedded_total} entities embedded.`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.collection.embed_model_key}`
    ], { timeout: 10000 });
  }
  /**
   * Halts the embed queue processing.
   * @param {string|null} msg - Optional message.
   */
  halt_embed_queue_processing(msg=null) {
    this.is_queue_halted = true;
    console.log("Embed queue processing halted");
    this.notices?.remove('embedding_progress');
    this.notices?.show('embedding_paused', [
      msg || `Embedding paused.`,
      `Progress: ${this.embedded_total} / ${this.collection.embed_queue.length}`,
      `${this._calculate_embed_tokens_per_second()} tokens/sec using ${this.collection.embed_model_key}`
    ],
      {
        timeout: 0,
        button: { text: "Resume", callback: () => this.resume_embed_queue_processing(100) }
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
    return Math.round(this.total_tokens / elapsed_time);
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
    return this.collection.notices;
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
    this.item.queue_save();
  }

}

export default {
  collection: DefaultEntitiesVectorAdapter,
  item: DefaultEntityVectorAdapter
};