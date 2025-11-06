import { CollectionItem } from '../smart-collections/item.js';

/**
 * @typedef {Object} EventLogData
 * @property {string} key - Event key (e.g., "chat:completed").
 * @property {number} ct - Total times this event key has been emitted.
 * @property {number|null} first_at - First observed occurrence (epoch ms).
 * @property {number|null} last_at - Most recent observed occurrence (epoch ms).
 */

/**
 * @function next_log_stats
 * @description Pure reducer for counters and timestamps (ms).
 * @param {Pick<EventLogData,'ct'|'first_at'|'last_at'>} prev
 * @param {number} at_ms
 * @returns {Pick<EventLogData,'ct'|'first_at'|'last_at'>}
 */
export function next_log_stats(prev = {}, at_ms) {
  const ct = (prev.ct || 0) + 1;
  const first_at = prev.first_at ?? at_ms;
  const last_at = at_ms;
  return { ct, first_at, last_at };
}

/**
 * @class EventLog
 * @extends CollectionItem
 */
export class EventLog extends CollectionItem {
  static version = 0.002;

  /** @returns {{data: EventLogData}} */
  static get defaults() {
    return {
      data: {
        key: null,
        ct: 0,
        first_at: null,
        last_at: null
      }
    };
  }

  /**
   * Counters are updated via EventLogs listener.
   * @param {Partial<EventLogData>} [_input_data]
   */
  init(_input_data) {}
}

export default EventLog;
