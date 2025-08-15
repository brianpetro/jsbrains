import { DefaultEventsAdapter } from './adapters/default.js';

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
    this.opts = opts;
    this.adapter = opts.adapter || new DefaultEventsAdapter(opts);
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
   * Emit an event with a `received_at` timestamp.
   * @param {string} event_key
   * @param {Record<string, unknown>} [event]
   * @returns {void}
   */
  emit(event_key, event = {}) {
    const payload = { received_at: new Date().toISOString(), ...event };
    return this.adapter.emit(event_key, payload);
  }
}

export default SmartEvents;
