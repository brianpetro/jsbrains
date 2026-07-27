// @ts-check

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

/** @typedef {import('smart-types').EntityConnectionResult} EntityConnectionResult */
/** @typedef {import('smart-types').EntitiesVectorProgressState} EntitiesVectorProgressState */
/** @typedef {Object.<string, *> & {collection: *}} DefaultEntitiesVectorAdapterThis */
/** @typedef {Object.<string, *> & {item: *}} DefaultEntityVectorAdapterThis */

/**
 * @class DefaultEntitiesVectorAdapter
 * @extends EntitiesVectorAdapter
 * @classdesc
 * Implements an in-memory vector store using entity data.
 * Stores embeddings in the item's `data.embeddings` keyed by `embed_model_key`.
 * Supports nearest/furthest queries and batch embedding via the collection's embed_model.
 */
export class DefaultEntitiesVectorAdapter extends EntitiesVectorAdapter {
  /**
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {*} collection
   */
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
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {number[]|ArrayBufferView|Object} vec - The reference vector or an item whose `vec` resolves one.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<EntityConnectionResult>>} Array of results sorted by score descending.
   */
  async nearest(vec, filter = {}) {
    vec = vec?.vec || vec;
    if (!vec || (!Array.isArray(vec) && !ArrayBuffer.isView(vec))) {
      throw new Error('Invalid vector input to nearest()');
    }
    const {
      limit = 50,
    } = filter;
    const nearest = this.collection.filter(filter)
      .reduce((acc, item) => {
        const item_vec = item.vec;
        if (!item_vec) return acc;
        const result = { item, score: cos_sim(vec, item_vec) };
        results_acc(acc, result, limit);
        return acc;
      }, {
        min: Number.POSITIVE_INFINITY,
        minResult: null,
        results: new Set(),
      });
    return Array.from(nearest.results).sort(sort_by_score_descending);
  }

  /**
   * Find the furthest entities from the given vector.
   * @async
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {number[]|ArrayBufferView|Object} vec - The reference vector or an item whose `vec` resolves one.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<EntityConnectionResult>>} Array of results sorted by score ascending (furthest).
   */
  async furthest(vec, filter = {}) {
    vec = vec?.vec || vec;
    if (!vec || (!Array.isArray(vec) && !ArrayBuffer.isView(vec))) {
      throw new Error('Invalid vector input to furthest()');
    }
    const {
      limit = 50,
    } = filter;
    const furthest = this.collection.filter(filter)
      .reduce((acc, item) => {
        const item_vec = item.vec;
        if (!item_vec) return acc;
        const result = { item, score: cos_sim(vec, item_vec) };
        furthest_acc(acc, result, limit);
        return acc;
      }, {
        max: Number.NEGATIVE_INFINITY,
        maxResult: null,
        results: new Set(),
      });
    return Array.from(furthest.results).sort(sort_by_score_ascending);
  }

  /**
   * Embed a batch of entities.
   * @async
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {Object[]} entities - Array of entity instances to embed.
   * @returns {Promise<Object[]>}
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
    });
    return embeddings;
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Prevents multiple concurrent runs by using `_is_processing_embed_queue`.
   * Paused queues fail closed and do not restart until resume explicitly clears
   * the paused state.
   * @async
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    if (this._is_processing_embed_queue) return;
    if (this.is_embed_queue_paused() && !this._resume_after_pause) return;
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
      this._is_processing_embed_queue = false;
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      const embed_queue = this.collection.embed_queue;
      this._reset_embed_queue_stats();
      const embedded_keys_by_collection = {};

      if (this.collection.embed_model_key === 'None') return;
      if (!this.collection.embed_model) return;
      if (!embed_queue.length) return;

      this.current_queue_total = embed_queue.length;
      this.embedding_started_at = Date.now();
      this._start_embed_progress_state(embed_queue.length);

      const embed_model = this.collection.embed_model;
      const embed_adapter = embed_model.adapter || embed_model;
      const batch_size = Math.max(1, Math.floor(Number(embed_model.batch_size) || 1));
      const batch_window_size = Math.max(
        batch_size,
        Math.floor(Number(embed_adapter.batch_window_size) || batch_size),
      );
      const sort_by_input_length = embed_adapter.batch_sort_by_input_length === true;

      for (let window_start = 0; window_start < embed_queue.length; window_start += batch_window_size) {
        if (this.is_queue_halted) break;

        const window_items = embed_queue.slice(window_start, window_start + batch_window_size);
        const prepared_window = await Promise.all(window_items.map(async (item, window_item_i) => {
          const embed_input = await item.get_embed_input();
          const input_value = typeof embed_input === 'string' ? embed_input : '';
          return {
            item,
            input_length: input_value.length,
            window_item_i,
          };
        }));

        if (sort_by_input_length) {
          prepared_window.sort((a, b) => {
            if (a.input_length !== b.input_length) return a.input_length - b.input_length;
            return a.window_item_i - b.window_item_i;
          });
        }

        for (let batch_start = 0; batch_start < prepared_window.length; batch_start += batch_size) {
          if (this.is_queue_halted) break;

          const batch_entries = prepared_window.slice(batch_start, batch_start + batch_size);
          const batch = batch_entries.map((entry) => entry.item);
          let batch_results;

          try {
            const start_time = Date.now();
            batch_results = await this.embed_batch(batch);
            this.total_time += Date.now() - start_time;
          } catch (error) {
            console.error(`Error processing ${this.collection.collection_key} embed queue:`, error);
            this._emit_embedding_error({
              message: `Embedding failed while processing ${this.collection.collection_key}.`,
              details: error?.message || JSON.stringify((error || {}), null, 2),
            });
            break;
          }

          batch.forEach((item) => {
            item.embed_hash = item.read_hash;
            item._queue_save = true;
            embedded_keys_by_collection[item.collection_key] ||= [];
            embedded_keys_by_collection[item.collection_key].push(item.key);
          });
          this.embedded_total += batch.length;
          batch_entries.forEach((entry, entry_i) => {
            const result = batch_results?.[entry_i];
            if (result?.skipped) return;
            this.total_characters += entry.input_length;
            this.total_tokens += result?.tokens ?? entry.input_length / 4;
          });

          const processed_all = this.embedded_total >= embed_queue.length;
          const is_paused = this.is_queue_halted && !processed_all;
          if (is_paused) {
            this._update_paused_progress_state(embed_queue.length, this.progress_state?.reason || '');
          } else {
            this._update_embed_progress_state(embed_queue.length);
          }

          if (this.is_queue_halted && processed_all) {
            this.is_queue_halted = false;
          }

          if (is_paused || this.should_show_embed_progress_notice || processed_all) {
            this._show_embed_progress_notice(embed_queue.length);
          }

          if (this.embedded_total - this.last_save_total > 99) {
            this.last_save_total = this.embedded_total;
            await this.collection.process_save_queue();
            if (this.collection.block_collection) {
              await this.collection.block_collection.process_save_queue();
            }
          }
        }
      }

      Object.entries(embedded_keys_by_collection).forEach(([collection_key, keys]) => {
        this.collection.env.events?.emit('items:embedded', {
          collection_key,
          keys,
          event_source: 'process_embed_queue',
          skip_save_log_collection: true,
        });
      });

      const processed_all = this.embedded_total >= embed_queue.length;
      const is_paused = Boolean(this.progress_state?.paused) && !processed_all;
      if (!is_paused && !this._embed_run_error) {
        this._show_embed_completion_notice(embed_queue.length);
      }

      await this.collection.process_save_queue();
      if (this.collection.block_collection) {
        await this.collection.block_collection.process_save_queue();
      }

      if (!this._embed_run_error) {
        const elapsed_ms = Date.now() - this.embedding_started_at;
        console.log(`${this.total_characters} characters embedded in ${elapsed_ms}ms`);
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

  /**
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {boolean}
   */
  get should_show_embed_progress_notice() {
    if ((Date.now() - (this.last_notice_time ?? 0)) > 20000) {
      return true;
    }
    return (this.embedded_total - this.last_notice_embedded_total) >= 100;
  }

  /**
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {object|null}
   */
  get_progress_state() {
    return this.progress_state ? { ...this.progress_state } : null;
  }

  /**
   * Displays embed progress via env events and internal state.
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {number} embed_queue_length
   * @returns {void}
   */
  _show_embed_progress_notice(embed_queue_length) {
    this.last_notice_time = Date.now();
    this.last_notice_embedded_total = this.embedded_total;
    const is_paused = Boolean(this.progress_state?.paused);
    const reason = this.progress_state?.reason || '';
    if (is_paused) {
      this._update_paused_progress_state(embed_queue_length, reason);
    } else {
      this._update_embed_progress_state(embed_queue_length);
    }
    this.collection.emit_event('embedding:progress', {
      progress: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      characters_embedded: this.total_characters,
      elapsed_ms: Date.now() - this.embedding_started_at,
      model_name: this.collection.embed_model_key,
      paused: is_paused,
      reason,
      event_source: 'process_embed_queue',
      skip_save_log_collection: true,
    });
  }

  /**
   * Displays the embedding completion notice.
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {number} embed_queue_length
   * @returns {void}
   */
  _show_embed_completion_notice(embed_queue_length) {
    const payload = {
      total_embeddings: this.embedded_total,
      total: embed_queue_length,
      tokens_per_second: this._calculate_embed_tokens_per_second(),
      characters_embedded: this.total_characters,
      elapsed_ms: Date.now() - this.embedding_started_at,
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
   * @this {DefaultEntitiesVectorAdapterThis}
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
      characters_embedded: this.total_characters,
      elapsed_ms: this.embedding_started_at ? Date.now() - this.embedding_started_at : 0,
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
      characters_embedded: this.total_characters,
      elapsed_ms: this.embedding_started_at ? Date.now() - this.embedding_started_at : 0,
      model_name: this.collection.embed_model_key,
      event_source: 'halt_embed_queue_processing',
    });
  }

  /**
   * Returns whether the adapter is currently paused.
   * Paused state remains sticky until resume explicitly clears it.
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {boolean}
   */
  is_embed_queue_paused() {
    return Boolean(this.progress_state?.paused);
  }

  /**
   * Resumes the embed queue processing after a delay.
   * If the active batch has not yet latched the pause request, resume is deferred
   * until the current run exits cleanly.
   * @this {DefaultEntitiesVectorAdapterThis}
   * @param {number} [delay=0] - The delay in milliseconds before resuming.
   * @returns {void}
   */
  resume_embed_queue_processing(delay = 0) {
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
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {number} Tokens per second.
   */
  _calculate_embed_tokens_per_second() {
    const elapsed_time = this.total_time / 1000;
    return Math.round(this.total_tokens / (elapsed_time || 1));
  }

  /**
   * Resets the statistics related to embed queue processing.
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
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
    this.total_characters = 0;
    this.embedding_started_at = 0;
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
   * @this {DefaultEntitiesVectorAdapterThis}
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
   * @this {DefaultEntitiesVectorAdapterThis}
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
      characters_embedded: 0,
      elapsed_ms: 0,
      model_name: this.collection.embed_model_key,
    });
    this.collection.emit_event('embedding:started', {
      progress: 0,
      total,
      characters_embedded: 0,
      elapsed_ms: 0,
      model_name: this.collection.embed_model_key,
      event_source: 'process_embed_queue',
    });
  }

  /**
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
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
      characters_embedded: this.total_characters,
      elapsed_ms: Date.now() - this.embedding_started_at,
      model_name: this.collection.embed_model_key,
    });
  }

  /**
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
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
      characters_embedded: this.total_characters,
      elapsed_ms: Date.now() - this.embedding_started_at,
      model_name: this.collection.embed_model_key,
      reason,
    });
  }

  /**
   * @private
   * @this {DefaultEntitiesVectorAdapterThis}
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

  /**
   * @this {DefaultEntitiesVectorAdapterThis}
   * @returns {*}
   */
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
  /**
   * @this {DefaultEntityVectorAdapterThis}
   * @returns {*}
   */
  get data() {
    return this.item.data;
  }

  /**
   * Retrieve the current vector embedding for this entity.
   * @async
   * @this {DefaultEntityVectorAdapterThis}
   * @returns {Promise<number[]|undefined>} The entity's vector or undefined if not set.
   */
  async get_vec() {
    return this.vec;
  }

  /**
   * Store/update the vector embedding for this entity.
   * @async
   * @this {DefaultEntityVectorAdapterThis}
   * @param {number[]|null} vec - The vector to set.
   * @returns {Promise<void>}
   */
  async set_vec(vec) {
    this.vec = vec;
  }

  /**
   * Delete/remove the vector embedding for this entity.
   * @async
   * @this {DefaultEntityVectorAdapterThis}
   * @returns {Promise<void>}
   */
  async delete_vec() {
    if (this.item.data?.embeddings?.[this.item.embed_model_key]) {
      delete this.item.data.embeddings[this.item.embed_model_key].vec;
    }
  }

  /**
   * @this {DefaultEntityVectorAdapterThis}
   * @returns {number[]|undefined}
   */
  get vec() {
    return this.item.data?.embeddings?.[this.item.embed_model_key]?.vec;
  }

  /**
   * @this {DefaultEntityVectorAdapterThis}
   * @param {number[]|null} vec
   */
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
