/**
 * Base adapter outlining the event bus interface.
 */

export const WILDCARD_KEY = '*';

export class SmartEventsAdapter {
  constructor(instance) {
    this.instance = instance;
    // null-prototype map avoids proto collisions and deopts
    this.handlers = Object.create(null);
  }

  /**
   * Register an event handler.
   * When event_key is '*', the handler subscribes to all events.
   * Handlers receive (event, event_key).
   * @param {string} event_key
   * @param {Function} event_callback
   */
  on(event_key, event_callback) {}

  /**
   * Register a one-time handler.
   * When event_key is '*', the handler fires once on the next emitted event of any key.
   * Handlers receive (event, event_key).
   * @param {string} event_key
   * @param {Function} event_callback
   */
  once(event_key, event_callback) {}

  /**
   * Remove an event handler.
   * When event_key is '*', removes from the wildcard list only.
   * @param {string} event_key
   * @param {Function} event_callback
   */
  off(event_key, event_callback) {}

  /**
   * Emit an event.
   * event_key must not be '*'.
   * @param {string} event_key
   * @param {Object} event
   */
  emit(event_key, event) {}
}
