import { SmartEventsAdapter } from './_adapter.js';

/**
 * Dependency-free event bus adapter.
 */
export class DefaultEventsAdapter extends SmartEventsAdapter {
  on(event_key, event_callback = () => {}) {
    const list = this.handlers[event_key] || (this.handlers[event_key] = []);
    list.push(event_callback);
    return () => this.off(event_key, event_callback);
  }

  once(event_key, event_callback = () => {}) {
    const wrapper = (event) => {
      this.off(event_key, wrapper);
      event_callback(event);
    };
    return this.on(event_key, wrapper);
  }

  off(event_key, event_callback) {
    const list = this.handlers[event_key];
    if (!list) return;
    const index = list.indexOf(event_callback);
    if (index !== -1) list.splice(index, 1);
  }

  emit(event_key, event = {}) {
    const list = this.handlers[event_key];
    if (!list) return;
    [...list].forEach(fn => fn(event));
  }
}
