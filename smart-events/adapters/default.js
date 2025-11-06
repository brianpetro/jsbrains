import { SmartEventsAdapter, WILDCARD_KEY } from './_adapter.js';

/**
 * Dependency-free event bus adapter.
 */
export class DefaultEventsAdapter extends SmartEventsAdapter {
  on(event_key, event_callback = () => {}) {
    const key = event_key === WILDCARD_KEY ? WILDCARD_KEY : event_key;
    const list = this.handlers[key] || (this.handlers[key] = []);
    list.push(event_callback);
    return () => this.off(key, event_callback);
  }

  once(event_key, event_callback = () => {}) {
    const key = event_key === WILDCARD_KEY ? WILDCARD_KEY : event_key;
    const wrapper = (event, emitted_key) => {
      this.off(key, wrapper);
      event_callback(event, emitted_key);
    };
    return this.on(key, wrapper);
  }

  off(event_key, event_callback) {
    const list = this.handlers[event_key];
    if (!list || !event_callback) return;
    const index = list.indexOf(event_callback);
    if (index !== -1) list.splice(index, 1);
  }

  emit(event_key, event = {}) {
    if (event_key === WILDCARD_KEY) {
      throw new Error('emit("*") is not allowed; "*" is reserved for wildcard listeners.');
    }
    const specific_list = this.handlers[event_key];
    const wildcard_list = this.handlers[WILDCARD_KEY];

    if (!specific_list && !wildcard_list) return;

    const call_specific = specific_list ? [...specific_list] : [];
    const call_wildcard = wildcard_list ? [...wildcard_list] : [];

    // Specific first, then wildcard. Stable order by registration time.
    call_specific.forEach(fn => fn(event, event_key));
    call_wildcard.forEach(fn => fn(event, event_key));
  }
}
