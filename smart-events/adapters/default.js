import { SmartEventsAdapter, WILDCARD_KEY } from './_adapter.js';

/**
 * Dependency-free event bus adapter.
 * - Stores handler entries as { id, cb } to uniquely identify each subscription.
 * - Unsubscribe closures remove their exact registration via entry id.
 * - off(event_key, event_callback) removes a single matching registration (LIFO).
 */
export class DefaultEventsAdapter extends SmartEventsAdapter {
  constructor(instance) {
    super(instance);
    this._next_id = 1;
  }

  on(event_key, event_callback = () => {}) {
    const key = event_key === WILDCARD_KEY ? WILDCARD_KEY : event_key;
    const list = this.handlers[key] || (this.handlers[key] = []);
    const entry = { id: this._next_id++, cb: event_callback };
    list.push(entry);
    // Unsubscribe removes exactly this entry (not "all equal" callbacks).
    return () => this.off_entry(key, entry.id);
  }

  once(event_key, event_callback = () => {}) {
    const key = event_key === WILDCARD_KEY ? WILDCARD_KEY : event_key;
    const list = this.handlers[key] || (this.handlers[key] = []);
    // Create the entry first so the wrapper can reference its id.
    const entry = { id: this._next_id++, cb: null };
    const wrapper = (event, emitted_key) => {
      this.off_entry(key, entry.id);
      event_callback(event, emitted_key);
    };
    entry.cb = wrapper;
    list.push(entry);
    return () => this.off_entry(key, entry.id);
  }

  /**
   * Public removal by function reference.
   * Removes a single matching registration for the given function.
   * Preference is to remove the most-recent registration (LIFO) when duplicates exist.
   */
  off(event_key, event_callback) {
    const list = this.handlers[event_key];
    if (!list || !event_callback) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].cb === event_callback) {
        list.splice(i, 1);
        break; // remove only one
      }
    }
  }

  /**
   * Internal precise removal by entry id.
   * Used by unsubscribe closures returned from on/once.
   */
  off_entry(event_key, entry_id) {
    const list = this.handlers[event_key];
    if (!list) return;
    const idx = list.findIndex(e => e.id === entry_id);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(event_key, event = {}) {
    if (event_key === WILDCARD_KEY) {
      throw new Error('emit("*") is not allowed; "*" is reserved for wildcard listeners.');
    }
    const specific_list = this.handlers[event_key];
    const wildcard_list = this.handlers[WILDCARD_KEY];
    if (!specific_list && !wildcard_list) return;

    // Copy to preserve stable order during re-entrancy or unsubs in-flight.
    const call_specific = specific_list ? [...specific_list] : [];
    const call_wildcard = wildcard_list ? [...wildcard_list] : [];

    for (let i = 0; i < call_specific.length; i++) {
      call_specific[i].cb(event, event_key);
    }
    for (let i = 0; i < call_wildcard.length; i++) {
      call_wildcard[i].cb(event, event_key);
    }
  }
}
