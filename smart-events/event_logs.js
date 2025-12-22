import { Collection } from '../smart-collections/collection.js';
import { EventLog, next_log_stats } from './event_log.js';
import { SmartEvents } from './smart_events.js';
import { WILDCARD_KEY } from './adapters/_adapter.js';
import { AjsonSingleFileCollectionDataAdapter } from '../smart-collections/adapters/ajson_single_file.js';

const EXCLUDED_EVENT_KEYS = {
  'collection:save_started': true,
  'collection:save_completed': true,
};

/**
 * @class EventLogs
 * @extends Collection
 *
 * Responsibilities:
 * - Subscribe to env.events using "*"
 * - Maintain per-event-key counters and timestamps (epoch ms)
 * - Queue item saves and debounce collection save
 */
export class EventLogs extends Collection {
  static version = 0.003;
  constructor(env, opts = {}) {
    super(env, opts);
    this.session_events = []; // per session event log
    this.notification_status = null; // 'error' | 'warning' | 'info' | null
  }

  /**
   * Factory that attaches the collection to env and registers the wildcard listener.
   * @param {Object} env
   * @param {Object} [opts={}]
   * @returns {EventLogs}
   */
  static create(env, opts = {}) {
    const instance = new this(env, opts);
    instance.init();
    return instance;
  }

  /** Prefer an explicit item class to keep wiring thin. */
  get item_type() { return EventLog; }

  /**
   * Instance init
   * - Ensure env.events exists
   * - Register wildcard listener
   * - Idempotent across repeated calls
   */
  init() {
    if (!this.env?.events) SmartEvents.create(this.env);

    if (this._unsub_wildcard) this._unsub_wildcard();

    this._unsub_wildcard = this.env.events.on(WILDCARD_KEY, (event, event_key) => {
      this.on_any_event(event_key, event);
    });
  }

  /**
   * Handle any emitted event.
   * Persists counters and timestamps in epoch ms.
   * @param {string} event_key
   * @param {Record<string, unknown>} event
   */
  on_any_event(event_key, event) {
    if (EXCLUDED_EVENT_KEYS[event_key]) return;
    this.session_events.push({ event_key, event });
    if(event_key === 'notification:error') this.notification_status = 'error';
    else if(event_key === 'notification:warning' && this.notification_status !== 'error') this.notification_status = 'warning';
    else if(event_key === 'notification:attention' && !this.notification_status) this.notification_status = 'attention';
    try {
      if (typeof event_key !== 'string') return;

      const at_ms = Date.now();

      let event_log = this.get(event_key);
      if (!event_log) {
        event_log = new EventLog(this.env, { key: event_key });
        this.set(event_log);
        this.emit_event('event_log:first', {first_of_event_key: event_key});
      }

      const next = next_log_stats(
        { ct: event_log.data.ct, first_at: event_log.data.first_at, last_at: event_log.data.last_at },
        at_ms
      );

      event_log.data = { ...event_log.data, ...next };
      if(event.event_source){
        if(!event_log.data.event_sources) event_log.data.event_sources = {};
        if(!event_log.data.event_sources[event.event_source]){
          event_log.data.event_sources[event.event_source] = 0;
        }
        event_log.data.event_sources[event.event_source]++;
      }
      event_log.queue_save();
      this.queue_save();
    } catch (err) {
      // Never throw from a listener; keep bus pure and resilient.
      console.error('[EventLogs] record failure', event_key, err);
    }
  }

  /**
   * Cleanly detach listeners and cancel pending save.
   */
  unload() {
    if (this._save_timer) {
      clearTimeout(this._save_timer);
      this._save_timer = null;
    }
    if (typeof this._unsub_wildcard === 'function') {
      this._unsub_wildcard();
      this._unsub_wildcard = null;
    }
    return super.unload();
  }
}

export default {
  class: EventLogs,
  collection_key: 'event_logs',
  data_adapter: AjsonSingleFileCollectionDataAdapter,
  item_type: EventLog,
};
