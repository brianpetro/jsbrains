import { DefaultEventsAdapter } from './adapters/default.js';

/**
 * Check if a value is a JSON-serializable primitive.
 * @param {unknown} value
 * @returns {boolean}
 */
const is_primitive = value => value === null || ['string', 'number', 'boolean'].includes(typeof value);

/**
 * Validate payload values are JSON-safe.
 * @param {Record<string, unknown>} payload
 */
const validate_payload = payload => {
  for (const [key, value] of Object.entries(payload)) {
    if (is_primitive(value)) continue;
    if (Array.isArray(value)) {
      if (value.every(is_primitive)) continue;
      throw new Error(`Invalid event payload value for "${key}". Arrays must contain only primitives.`);
    }
    if (typeof value === 'function') {
      throw new Error(`Invalid event payload value for "${key}". Functions are not allowed.`);
    }
    throw new Error(`Invalid event payload value for "${key}". Received instance of ${value?.constructor?.name}; project data explicitly.`);
  }
};

/**
 * Thin wrapper around an events adapter.
 *
 * ```mermaid
 * graph TD;
 *   E[env.events] --> A[adapter.on/emit];
 *   A --> H[registered handlers];
 * ```
 */
export class SmartEvents {
  constructor(env, opts = {}) {
    env?.create_env_getter?.(this);
    this.env = env;
    this.opts = {
      append_at: true,
      freeze_payload: true,
      validate_payload: true,
      now: () => new Date().toISOString(),
      ...opts,
    };
    this.adapter = this.opts.adapter || new DefaultEventsAdapter(this.opts);
  }

  static create(env, params = {}) {
    const { adapter = 'default', ...config } = params;
    const adapters = { default: DefaultEventsAdapter };
    const AdapterClass = typeof adapter === 'string' ? adapters[adapter] : adapter;
    const smart_events = new SmartEvents(env, { ...config, adapter: new AdapterClass(config) });
    if (!Object.getOwnPropertyDescriptor(env, 'events')) {
      Object.defineProperty(env, 'events', { get: () => smart_events });
    }
    return smart_events;
  }

  on(event_key, event_callback = (event) => {}) {
    return this.adapter.on(event_key, event_callback);
  }

  once(event_key, event_callback = (event) => {}) {
    return this.adapter.once(event_key, event_callback);
  }

  off(event_key, event_callback = (event) => {}) {
    return this.adapter.off(event_key, event_callback);
  }

  /**
   * Emit an event.
   * @param {string} event_key
   * @param {Record<string, unknown>} [event]
   * @returns {void}
   */
  emit(event_key, event = {}) {
    const payload = { ...event };
    if (this.opts.append_at && payload.at === undefined) {
      payload.at = this.opts.now();
    }
    if (this.opts.validate_payload) {
      validate_payload(payload);
    }
    if (this.opts.freeze_payload) {
      Object.freeze(payload);
    }
    return this.adapter.emit(event_key, payload);
  }
}

export default SmartEvents;
