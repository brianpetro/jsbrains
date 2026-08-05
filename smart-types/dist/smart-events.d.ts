export type NotificationLevel = "milestone" | "attention" | "error" | "warning" | "info";
/**
 * @typedef {'milestone'|'attention'|'error'|'warning'|'info'} NotificationLevel
 * @description Canonical event level used by SmartEvents and EventLogs.
 */
export const NotificationLevel: "";
export type EventSeverity = "attention" | "warning" | "error" | null;
/**
 * @typedef {'attention'|'warning'|'error'|null} EventSeverity
 * @description Escalation-only severity used for notification aggregation.
 */
export const EventSeverity: null;
export type SmartEventPayload = {
    /**
     * - Epoch milliseconds when the event occurred.
     */
    at?: number;
    /**
     * - Optional canonical event level.
     */
    level?: import("./smart-events.js").NotificationLevel;
    /**
     * - Optional primary human-readable message.
     */
    message?: string;
    /**
     * - Optional secondary details.
     */
    details?: string;
    /**
     * - Source identifier for downstream grouping.
     */
    event_source?: string;
    /**
     * - Collection scope when emitted by Collection helpers.
     */
    collection_key?: string;
    /**
     * - Item scope when emitted by CollectionItem helpers.
     */
    item_key?: string;
    /**
     * - Hint used by EventLogs for high-frequency events.
     */
    skip_save_log_collection?: boolean;
};
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
export const SmartEventPayload: {};
export type SmartEventHandler = (arg0: import("./smart-events.js").SmartEventPayload, arg1: string) => void;
export function SmartEventHandler(): void;
export type SmartEventDisposer = () => void;
export function SmartEventDisposer(): void;
export type SmartEvents<TPayload = SmartEventPayload> = {
    /**
     * - Emits an event payload.
     */
    emit: (event_key: string, payload?: TPayload) => void;
    /**
     * - Registers a listener and returns its disposer.
     */
    on: (event_key: string, callback: (payload: TPayload) => void) => import("./smart-events.js").SmartEventDisposer;
};
/**
 * @template [TPayload=import('./smart-events.js').SmartEventPayload]
 * @typedef {Object} SmartEvents
 * @property {(event_key: string, payload?: TPayload) => void} emit - Emits an event payload.
 * @property {(event_key: string, callback: (payload: TPayload) => void) => import('./smart-events.js').SmartEventDisposer} on - Registers a listener and returns its disposer.
 */
export const SmartEvents: {};
export type EventSessionEntry = {
    /**
     * - Emitted event key.
     */
    event_key: string;
    /**
     * - Frozen event payload.
     */
    event: import("./smart-events.js").SmartEventPayload;
    /**
     * - Epoch milliseconds for this session entry.
     */
    at: number;
    /**
     * - Resolved canonical level.
     */
    level: import("./smart-events.js").NotificationLevel | null;
    /**
     * - Whether the entry is still unseen in the session.
     */
    unseen: boolean;
    /**
     * - Whether native notice UI was shown for the entry.
     */
    native_notice_shown: boolean;
};
/**
 * @typedef {Object} EventSessionEntry
 * @property {string} event_key - Emitted event key.
 * @property {import('./smart-events.js').SmartEventPayload} event - Frozen event payload.
 * @property {number} at - Epoch milliseconds for this session entry.
 * @property {import('./smart-events.js').NotificationLevel|null} level - Resolved canonical level.
 * @property {boolean} unseen - Whether the entry is still unseen in the session.
 * @property {boolean} native_notice_shown - Whether native notice UI was shown for the entry.
 */
export const EventSessionEntry: {};
export type EventLogData = {
    /**
     * - Event key such as chat:completed.
     */
    key: string;
    /**
     * - Total observed count for the event key.
     */
    ct: number;
    /**
     * - First observed occurrence in epoch ms.
     */
    first_at: number | null;
    /**
     * - Most recent observed occurrence in epoch ms.
     */
    last_at: number | null;
    /**
     * - Counts grouped by event_source.
     */
    event_sources?: {
        [x: string]: number;
    };
};
/**
 * @typedef {Object} EventLogData
 * @property {string} key - Event key such as chat:completed.
 * @property {number} ct - Total observed count for the event key.
 * @property {number|null} first_at - First observed occurrence in epoch ms.
 * @property {number|null} last_at - Most recent observed occurrence in epoch ms.
 * @property {Object.<string, number>} [event_sources] - Counts grouped by event_source.
 */
export const EventLogData: {};
