import { DefaultEventsAdapter } from './adapters/default.js';

/**
 * Opinionated event bus.
 *
 * ```mermaid
 * graph TD;
 *   E[env.events] --> A[adapter.on/emit];
 *   A --> H[handlers];
 * ```
 */
export class SmartEvents {
  constructor(env, opts = {}) {
    env.create_env_getter(this);
    this.opts = opts;
  }

  static create(env, opts = {}) {
    const smart_events = new SmartEvents(env, opts);
    if (!Object.getOwnPropertyDescriptor(env, 'events')) {
      Object.defineProperty(env, 'events', { get: () => smart_events });
    }
    return smart_events;
  }

  get adapter() {
    if (!this._adapter) {
      this._adapter = this.opts.adapter_class
        ? new this.opts.adapter_class(this)
        : new DefaultEventsAdapter(this)
      ;
    }
    return this._adapter;
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
    if (payload.at === undefined) {
      payload.at = Date.now(); // epoch ms
    }
    Object.freeze(payload);
    return this.adapter.emit(event_key, payload);
  }
}

export default SmartEvents;
