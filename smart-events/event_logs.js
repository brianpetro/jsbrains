import { Collection } from '../smart-collections/collection.js';
import { EventLog, next_log_stats } from './event_log.js';
import { SmartEvents } from './smart_events.js';
import { WILDCARD_KEY } from './adapters/_adapter.js';
import { AjsonSingleFileCollectionDataAdapter } from '../smart-collections/adapters/ajson_single_file.js';
import {
  get_event_level,
  get_next_notification_status,
} from './event_level_utils.js';

const EXCLUDED_EVENT_KEYS = {
  'collection:save_started': true,
  'collection:save_completed': true,
  'notifications:seen': true,
  'notifications:seen_all': true,
  'event_logs:mute_changed': true,
  'event_log:first': true,
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
  static version = 0.004;
  constructor(env, opts = {}) {
    super(env, opts);
    this.session_events = [];
    this.notification_status = null;
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
   *
   * @param {string} event_key
   * @param {Record<string, unknown>} event
   * @returns {{event_key: string, event: Record<string, unknown>, at: number, level: string | null, unseen: boolean, native_notice_shown: boolean} | null}
   */
  on_any_event(event_key, event) {
    if (EXCLUDED_EVENT_KEYS[event_key]) return null;

    const at_ms = typeof event?.at === 'number' ? event.at : Date.now();
    const derived_level = get_event_level(event_key, event);
    const session_entry = {
      event_key,
      event,
      at: at_ms,
      level: derived_level,
      unseen: Boolean(derived_level),
      native_notice_shown: false,
    };

    this.session_events.push(session_entry);
    this.notification_status = get_next_notification_status(this.notification_status, event_key, event);

    try {
      if (typeof event_key !== 'string') return session_entry;

      let event_log = this.get(event_key);
      if (!event_log) {
        event_log = new EventLog(this.env, { key: event_key });
        this.set(event_log);
        this.emit_event('event_log:first', { first_of_event_key: event_key });
      }

      const next = next_log_stats(
        {
          ct: event_log.data.ct,
          first_at: event_log.data.first_at,
          last_at: event_log.data.last_at,
        },
        at_ms,
      );

      event_log.data = { ...event_log.data, ...next };
      if (event?.event_source) {
        if (!event_log.data.event_sources) event_log.data.event_sources = {};
        if (!event_log.data.event_sources[event.event_source]) {
          event_log.data.event_sources[event.event_source] = 0;
        }
        event_log.data.event_sources[event.event_source] += 1;
      }
      event_log.queue_save();
      this.queue_save();
    } catch (err) {
      console.error('[EventLogs] record failure', event_key, err);
    }

    return session_entry;
  }

  /**
   * Recompute severity status from unseen session entries.
   *
   * @returns {'attention'|'warning'|'error'|null}
   */
  refresh_notification_status() {
    this.notification_status = this.session_events.reduce((current_status, session_entry) => {
      if (!session_entry?.unseen) return current_status;
      return get_next_notification_status(current_status, session_entry.event_key, session_entry.event);
    }, null);
    return this.notification_status;
  }

  /**
   * Return unseen session entries.
   *
   * @returns {Array<object>}
   */
  get_unseen_notification_entries() {
    return this.session_events.filter((session_entry) => session_entry?.unseen === true);
  }

  /**
   * Count unseen canonical notifications.
   *
   * @returns {number}
   */
  get_unseen_notification_count() {
    return this.get_unseen_notification_entries().length;
  }

  /**
   * Mark a single session entry as seen.
   *
   * @param {object} session_entry
   * @param {object} [params={}]
   * @param {boolean} [params.native_notice_shown=false]
   * @returns {boolean}
   */
  mark_session_entry_seen(session_entry, params = {}) {
    if (!session_entry || session_entry.unseen !== true) return false;
    const { native_notice_shown = false } = params;

    session_entry.unseen = false;
    if (native_notice_shown) {
      session_entry.native_notice_shown = true;
    }

    this.refresh_notification_status();
    this.env?.events?.emit?.('notifications:seen', {
      event_key: session_entry.event_key,
      native_notice_shown,
    });
    return true;
  }

  /**
   * Mark all unseen canonical notifications as seen.
   *
   * @returns {boolean}
   */
  mark_all_notification_entries_seen() {
    let seen_count = 0;

    for (const session_entry of this.session_events) {
      if (session_entry?.unseen !== true) continue;
      session_entry.unseen = false;
      seen_count += 1;
    }

    if (!seen_count) return false;

    this.refresh_notification_status();
    this.env?.events?.emit?.('notifications:seen_all', { count: seen_count });
    return true;
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
