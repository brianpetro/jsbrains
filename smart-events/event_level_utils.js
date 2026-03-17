export const notification_levels = Object.freeze([
  'milestone',
  'attention',
  'error',
  'warning',
  'info',
]);

const notification_level_set = new Set(notification_levels);
const severity_order = {
  attention: 1,
  warning: 2,
  error: 3,
};

/**
 * Normalize a candidate event level.
 *
 * @param {unknown} level
 * @returns {'milestone'|'attention'|'error'|'warning'|'info'|null}
 */
export function normalize_event_level(level) {
  if (typeof level !== 'string') return null;
  const normalized_level = level.trim().toLowerCase();
  if (!notification_level_set.has(normalized_level)) return null;
  return normalized_level;
}

/**
 * Resolve legacy `notification:<level>` event keys.
 *
 * @param {string} [event_key='']
 * @returns {'milestone'|'attention'|'error'|'warning'|'info'|null}
 */
export function get_legacy_notification_level(event_key = '') {
  if (typeof event_key !== 'string') return null;
  const trimmed_event_key = event_key.trim().toLowerCase();
  if (!trimmed_event_key.startsWith('notification:')) return null;
  const [, legacy_level = ''] = trimmed_event_key.split(':');
  return normalize_event_level(legacy_level);
}

/**
 * Optional feed-only fallback for domain keys that end with `:error`.
 *
 * @param {string} [event_key='']
 * @returns {'error'|null}
 */
export function get_display_fallback_level(event_key = '') {
  if (typeof event_key !== 'string') return null;
  const trimmed_event_key = event_key.trim().toLowerCase();
  const event_key_parts = trimmed_event_key.split(':').filter(Boolean);
  const last_part = event_key_parts[event_key_parts.length - 1];
  if (last_part === 'error') return 'error';
  return null;
}

/**
 * Resolve the canonical event level.
 *
 * Resolution order:
 * 1. payload `event.level`
 * 2. legacy `notification:<level>` event key
 * 3. optional feed-only fallback (`*:error`)
 *
 * @param {string} [event_key='']
 * @param {Record<string, unknown>} [event={}]
 * @param {object} [params={}]
 * @param {boolean} [params.allow_display_fallback=false]
 * @returns {'milestone'|'attention'|'error'|'warning'|'info'|null}
 */
export function get_event_level(event_key = '', event = {}, params = {}) {
  const { allow_display_fallback = false } = params;
  const payload_level = normalize_event_level(event?.level);
  if (payload_level) return payload_level;

  const legacy_level = get_legacy_notification_level(event_key);
  if (legacy_level) return legacy_level;

  if (allow_display_fallback) {
    return get_display_fallback_level(event_key);
  }

  return null;
}

/**
 * Resolve the severity used by status-bar aggregation.
 * `milestone` is treated as `attention`.
 * `info` does not affect severity.
 *
 * @param {unknown} level
 * @returns {'attention'|'warning'|'error'|null}
 */
export function get_event_severity(level) {
  const normalized_level = normalize_event_level(level);
  if (normalized_level === 'milestone') return 'attention';
  if (normalized_level === 'attention') return 'attention';
  if (normalized_level === 'warning') return 'warning';
  if (normalized_level === 'error') return 'error';
  return null;
}

/**
 * Severity-stable aggregation for unseen notifications.
 * Escalates only and never downgrades.
 *
 * @param {'attention'|'warning'|'error'|null} current_status
 * @param {string} [event_key='']
 * @param {Record<string, unknown>} [event={}]
 * @returns {'attention'|'warning'|'error'|null}
 */
export function get_next_notification_status(current_status, event_key = '', event = {}) {
  const next_status = get_event_severity(get_event_level(event_key, event));
  if (!next_status) return current_status ?? null;

  const current_rank = severity_order[current_status] || 0;
  const next_rank = severity_order[next_status] || 0;

  if (next_rank > current_rank) return next_status;
  return current_status ?? next_status;
}