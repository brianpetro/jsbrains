/**
 * @file default.js
 * @description Default vector adapters for SmartEntities and SmartCollections
 * Implements in-memory vector logic using the entity's `data.embeddings`.
 * Uses cosine similarity for nearest/furthest queries.
 */

import { EntitiesVectorAdapter, EntityVectorAdapter } from './_adapter.js';
import { cos_sim } from 'smart-utils/cos_sim.js';
import { results_acc, furthest_acc } from 'smart-utils/results_acc.js';
import { sort_by_score_ascending, sort_by_score_descending } from 'smart-utils/sort_by_score.js';

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
    this._resume_after_pause = false;
    this._resume_after_pause_delay = 0;
    this._resume_embed_timeout = null;
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
      throw new Error('Invalid vector input to nearest()');
    }
    const {
      limit = 50,
    } = filter;
    const nearest = this.collection.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc;
        const result = { item, score: cos_sim(vec, item.vec) };
        results_acc(acc, result, limit);
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
      throw new Error('Invalid vector input to furthest()');
    }
    const {
      limit = 50,
    } = filter;
    const furthest = this.collection.filter(filter)
      .reduce((acc, item) => {
        if (!item.vec) return acc;
        const result = { item, score: cos_sim(vec, item.vec) };
        furthest_acc(acc, result, limit);
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
    await Promise.all(entities.map((entity) => entity.get_embed_input()));
    const embeddings = await this.collection.embed_model.embed_batch(entities);
    embeddings.forEach((embedding, index) => {
      const entity = entities[index];
      entity.vec = embedding.vec;
      entity.data.last_embed = entity.data.last_read;
      if (embedding.tokens !== undefined) entity.tokens = embedding.tokens;
      entity.emit_event('item:embedded');
    });
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Prevents multiple concurrent runs by using `_is_processing_embed_queue`.
   * Paused queues fail closed and do not restart until resume explicitly clears
   * the paused state.
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    if (this._is_processing_embed_queue) {
      console.log('process_embed_queue is already running, skipping concurrent call.');
      return;
    }
    if (this.is_embed_queue_paused() && !this._resume_after_pause) {
      console.log('process_embed_queue is paused, skipping restart until resume.');
      return;
    }
    this._is_processing_embed_queue = true;
    this._embed_run_error = false;

    try {
      if (!this.collection.embed_model.is_loaded) {
        await this.collection.embed_model.load();
      }
    } catch (error) {
      this.collection.emit_event('embed_model:load_failed', {
        event_source: 'process_embed_queue',
      });
      this._emit_embedding_error({
        message: `Failed to load embedding model ${this.collection.embed_model_key}.`,
        details: error?.message || String(error || ''),
      });
      return;
    }

    try {
      const datetime_start = Date.now();
      console.log(`Getting embed queue for ${this.collection.collection_key}...`);
      await new Promise((resolve) => setTimeout(resolve, 1));
      const embed_queue = this.collection.embed_queue;
      this._reset_embed_queue_stats();

      if (this.collection.embed_model_key === 'None') {
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

      this.current_queue_total = embed_queue.length;
      this._start_embed_progress_state(embed_queue.length);

      for (let index = 0; index < embed_queue.length; index += this.collection.embed_model.batch_size) {
        if (this.is_queue_halted) {
          break;
        }

        const batch = embed_queue.slice(index, index + this.collection.embed_model.batch_size);
        await Promise.all(batch.map((item) => item.get_embed_input()));

        try {
          const start_time = Date.now();
          await this.embed_batch(batch);
          this.total_time += Date.now() - start_time;
        } catch (error) {
          console.error(error);
          console.error(`Error processing ${this.collection.collection_key} embed queue: ` + JSON.stringify((error || {}), null, 2));
          this._emit_embedding_error({
            message: `Embedding failed while processing ${this.collection.collection_key}.`,
            details: error?.message || JSON.stringify((error || {}), null, 2),
          });
          break;
        }

        batch.forEach((item) => {
          item.embed_hash = item.read_hash;
          item._queue_save = true;
        });
        this.embedded_total += batch.length;
        this.total_tokens += batch.reduce((acc, item) => acc + (item.tokens || 0), 0);

        const processed_all = this.embedded_total >= embed_queue.length;
        if (this.is_queue_halted && !processed_all) {
          this._update_paused_progress_state(embed_queue.length, this.progress_state?.reason || '');
        } else {
          this._update_embed_progress_state(embed_queue.length);
        }

        if (this.is_queue_halted && processed_all) {
          this.is_queue_halted = false;
        }

        if (this.should_show_embed_progress_notice || processed_all) {
          this._show_embed_progress_notice(embed_queue.length);
        }

        if (this.embedded_total - this.last_save_total > 99) {
          this.last_save_total = this.embedded_total;
          await this.collection.process_save_queue();
          if (this.collection.block_collection) {
            console.log(`Saving ${this.collection.block_collection.collection_key} block collection`);
            await this.collection.block_collection.process_save_queue();
          }
        }
      }

      const processed_all = this.embedded_total >= embed_queue.length;
      const is_paused = Boolean(this.progress_state?.paused) && !processed_all;
      if (!is_paused && !this._embed_run_error) {
        this._show_embed_completion_notice(embed_queue.length);
      }

      await this.collection.process_save_queue();
      if (this.collection.block_collection) {
        await this.collection.block_collection.process_save_queue();
      }
    } finally {
      this._is_processing_embed_queue = false;

      const should_resume_after_pause = this._resume_after_pause && this.is_embed_queue_paused();
      const resume_delay = this._resume_after_pause_delay || 0;
      this._resume_after_pause = false;
      this._resume_after_pause_delay = 0;

      if (should_resume_after_pause) {
        this.resume_embed_queue_processing(resume_delay);
      }
    }
  }

  get should_show_embed_progress_notice() {
    if ((Date.now() - (this.last_notice_time ?? 0)) > 20000) {
      return true;
    }
    return (this.embedded_total - this.last_notice_embedded_total) >= 100;
  }

  /**
   * @returns {object|null}
   */
  get_progress_state() {
    return this.progress_state ? { ...this.progress_state } : null;
  }

  /**
   * Displays embed progress via env events and internal state.
   * @private
   * @param {number} embed_queue_length
   * @returns {void}
   */
  _show_embed_progress_notice(embed_queue_length) {
    this.last_notice_time = Date.now();
    this.last_notice_embedded_total = this.embedded_total;
    this._update_embed_progress_state(embed_queue_length);
    this.collection.emit_event('embedding:progress', {
      progress: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
      event_source: 'process_embed_queue',
    });
  }

  /**
   * Displays the embedding completion notice.
   * @private
   * @param {number} embed_queue_length
   * @returns {void}
   */
  _show_embed_completion_notice(embed_queue_length) {
    const payload = {
      total_embeddings: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
      event_source: 'process_embed_queue',
    };
    this._set_progress_state(null);
    if (this.embedded_total > 100) {
      this.collection.emit_event('embedding:completed', {
        level: 'info',
        message: `Embedding completed for ${this.embedded_total} item${this.embedded_total === 1 ? '' : 's'}.`,
        ...payload,
      });
      return;
    }
    this.collection.emit_event('embedding:completed', payload);
  }

  /**
   * Halts the embed queue processing.
   * The current batch is allowed to finish, then the next loop iteration latches
   * the paused state and exits. This keeps the status bar stable and prevents a
   * half-finished batch from corrupting queue state.
   * Duplicate pause requests fail closed and do not emit extra paused events.
   *
   * @param {string|null} msg - Optional message.
   * @returns {void}
   */
  halt_embed_queue_processing(msg = null) {
    const total = this.progress_state?.total || this.current_queue_total || 0;
    const next_reason = msg || this.progress_state?.reason || '';

    if (this.is_embed_queue_paused()) {
      this._update_paused_progress_state(total, next_reason);
      return;
    }

    this.is_queue_halted = true;
    this._set_progress_state({
      active: true,
      paused: true,
      progress: this.embedded_total,
      total,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
      reason: next_reason,
    });
    this.collection.emit_event('embedding:paused', {
      level: 'attention',
      message: `Embedding paused at ${this.embedded_total}/${total}.`,
      details: next_reason,
      progress: this.embedded_total,
      total,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
      event_source: 'halt_embed_queue_processing',
    });
  }

  /**
   * Returns whether the adapter is currently paused.
   * Paused state remains sticky until resume explicitly clears it.
   * @returns {boolean}
   */
  is_embed_queue_paused() {
    return Boolean(this.progress_state?.paused);
  }

  /**
   * Resumes the embed queue processing after a delay.
   * If the active batch has not yet latched the pause request, resume is deferred
   * until the current run exits cleanly.
   * @param {number} [delay=0] - The delay in milliseconds before resuming.
   * @returns {void}
   */
  resume_embed_queue_processing(delay = 0) {
    console.log('resume_embed_queue_processing');

    if (this._resume_embed_timeout) {
      clearTimeout(this._resume_embed_timeout);
      this._resume_embed_timeout = null;
    }

    if (this._is_processing_embed_queue && this.is_queue_halted) {
      this._resume_after_pause = true;
      this._resume_after_pause_delay = delay;
      return;
    }

    this.is_queue_halted = false;
    this._set_progress_state(null);
    this.collection.emit_event('embedding:resumed', {
      model_name: this.collection.embed_model_key,
      event_source: 'resume_embed_queue_processing',
    });
    this._resume_embed_timeout = setTimeout(() => {
      this._resume_embed_timeout = null;
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
    this.last_notice_time = 0;
    this.total_tokens = 0;
    this.total_time = 0;
    this.current_queue_total = 0;
    this.progress_state = null;
    this._embed_run_error = false;
    this._resume_after_pause = false;
    this._resume_after_pause_delay = 0;
    if (this._resume_embed_timeout) {
      clearTimeout(this._resume_embed_timeout);
      this._resume_embed_timeout = null;
    }
  }

  /**
   * @private
   * @param {object|null} next_state
   * @returns {void}
   */
  _set_progress_state(next_state = null) {
    this.progress_state = next_state
      ? {
          ...next_state,
          updated_at: Date.now(),
        }
      : null
    ;
  }

  /**
   * @private
   * @param {number} total
   * @returns {void}
   */
  _start_embed_progress_state(total) {
    this._set_progress_state({
      active: true,
      paused: false,
      progress: 0,
      total,
      tokens_per_second: 0,
      model_name: this.collection.embed_model_key,
    });
    this.collection.emit_event('embedding:started', {
      progress: 0,
      total,
      model_name: this.collection.embed_model_key,
      event_source: 'process_embed_queue',
    });
  }

  /**
   * @private
   * @param {number} total
   * @returns {void}
   */
  _update_embed_progress_state(total) {
    this._set_progress_state({
      active: true,
      paused: false,
      progress: this.embedded_total,
      total,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
    });
  }

  /**
   * @private
   * @param {number} total
   * @param {string} reason
   * @returns {void}
   */
  _update_paused_progress_state(total, reason = '') {
    this._set_progress_state({
      active: true,
      paused: true,
      progress: this.embedded_total,
      total,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      model_name: this.collection.embed_model_key,
      reason,
    });
  }

  /**
   * @private
   * @param {object} [params={}]
   * @param {string} [params.message]
   * @param {string} [params.details]
   * @returns {void}
   */
  _emit_embedding_error(params = {}) {
    const {
      message = 'Embedding failed.',
      details = '',
    } = params;
    this._embed_run_error = true;
    this.is_queue_halted = true;
    this._set_progress_state(null);
    this.collection.emit_event('embedding:error', {
      level: 'error',
      message,
      details,
      model_name: this.collection.embed_model_key,
      event_source: 'process_embed_queue',
    });
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

  get vec() {
    return this.item.data?.embeddings?.[this.item.embed_model_key]?.vec;
  }

  set vec(vec) {
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
  item: DefaultEntityVectorAdapter,
};
