/**
 * Base adapter outlining the event bus interface.
 */
export class SmartEventsAdapter {
  constructor(instance) {
    this.instance = instance;
    this.handlers = {};
  }

  /**
   * Register an event handler.
   * @param {string} event_key
   * @param {Function} event_callback
   */
  on(event_key, event_callback) {}

  /**
   * Register a one-time handler.
   * @param {string} event_key
   * @param {Function} event_callback
   */
  once(event_key, event_callback) {}

  /**
   * Remove an event handler.
   * @param {string} event_key
   * @param {Function} event_callback
   */
  off(event_key, event_callback) {}

  /**
   * Emit an event.
   * @param {string} event_key
   * @param {Object} event
   */
  emit(event_key, event) {}
}
