/**
 * @typedef {'milestone'|'attention'|'error'|'warning'|'info'} NotificationLevel
 * @description Canonical event level used by SmartEvents and EventLogs.
 */
export const NotificationLevel = '';

/**
 * @typedef {'attention'|'warning'|'error'|null} EventSeverity
 * @description Escalation-only severity used for notification aggregation.
 */
export const EventSeverity = null;

/**
 * @typedef {Object} SmartEventPayload
 * @property {number} [at] - Epoch milliseconds when the event occurred.
 * @property {import('./smart-events.js').NotificationLevel} [level] - Optional canonical event level.
 * @property {string} [message] - Optional primary human-readable message.
 * @property {string} [details] - Optional secondary details.
 * @property {string} [event_source] - Source identifier for downstream grouping.
 * @property {string} [collection_key] - Collection scope when emitted by Collection helpers.
 * @property {string} [item_key] - Item scope when emitted by CollectionItem helpers.
 * @property {boolean} [skip_save_log_collection] - Hint used by EventLogs for high-frequency events.
 */
export const SmartEventPayload = {};

/**
 * @typedef {function(import('./smart-events.js').SmartEventPayload, string): void} SmartEventHandler
 * @description Event handler signature used by SmartEvents adapters.
 */
export const SmartEventHandler = function () {};

/**
 * @typedef {Object} EventSessionEntry
 * @property {string} event_key - Emitted event key.
 * @property {import('./smart-events.js').SmartEventPayload} event - Frozen event payload.
 * @property {number} at - Epoch milliseconds for this session entry.
 * @property {import('./smart-events.js').NotificationLevel|null} level - Resolved canonical level.
 * @property {boolean} unseen - Whether the entry is still unseen in the session.
 * @property {boolean} native_notice_shown - Whether native notice UI was shown for the entry.
 */
export const EventSessionEntry = {};

/**
 * @typedef {Object} EventLogData
 * @property {string} key - Event key such as chat:completed.
 * @property {number} ct - Total observed count for the event key.
 * @property {number|null} first_at - First observed occurrence in epoch ms.
 * @property {number|null} last_at - Most recent observed occurrence in epoch ms.
 * @property {Object.<string, number>} [event_sources] - Counts grouped by event_source.
 */
export const EventLogData = {};
