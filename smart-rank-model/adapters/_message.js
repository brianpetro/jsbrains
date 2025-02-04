import { SmartRankAdapter } from "./_adapter.js";

/**
 * Base adapter for message-based ranking implementations (iframe/worker)
 * Handles communication between main thread and isolated contexts.
 * @abstract
 * @class SmartRankMessageAdapter
 * @extends SmartRankAdapter
 */
export class SmartRankMessageAdapter extends SmartRankAdapter {
  /**
   * Create message adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /**
     * Queue of pending message promises
     * @type {Object.<string, {resolve: Function, reject: Function}>}
     * @private
     */
    this.message_queue = {};

    /** 
     * Counter for message IDs
     * @type {number}
     * @private
     */
    this.message_id = 0;

    /** 
     * Message connector implementation
     * @type {string|null}
     * @protected
     */
    this.connector = null;

    /** 
     * Unique prefix for message IDs
     * @type {string}
     * @private
     */
    this.message_prefix = `msg_${Math.random().toString(36).substr(2, 9)}_`;
  }

  /**
   * Send message and wait for response
   * @protected
   * @param {string} method - Method name to call (e.g., 'rank')
   * @param {Object} params - Parameters for the method
   * @returns {Promise<any>} Response data
   */
  async _send_message(method, params) {
    return new Promise((resolve, reject) => {
      const id = `${this.message_prefix}${this.message_id++}`;
      this.message_queue[id] = { resolve, reject };
      this._post_message({ method, params, id });
    });
  }

  /**
   * Handle response message from worker/iframe
   * @protected
   * @param {string} id - Message ID
   * @param {*} result - Response result
   * @param {Error} [error] - Response error
   */
  _handle_message_result(id, result, error) {
    if (!id.startsWith(this.message_prefix)) return;

    if (result?.model_loaded) {
      console.log('model loaded');
      this.model.model_loaded = true;
      this.model.set_state('loaded');
      this.set_state('loaded');
    }

    if (this.message_queue[id]) {
      if (error) {
        this.message_queue[id].reject(new Error(error));
      } else {
        this.message_queue[id].resolve(result);
      }
      delete this.message_queue[id];
    }
  }

  /**
   * Rank documents based on a query
   * @param {string} query - The query
   * @param {Array<string>} documents - Documents to rank
   * @returns {Promise<Array<Object>>} Ranking results
   */
  async rank(query, documents) {
    return this._send_message('rank', { query, documents });
  }

  /**
   * Post message to worker/iframe
   * @abstract
   * @protected
   * @param {Object} message_data - Message to send
   * @throws {Error} If not implemented by subclass
   */
  _post_message(message_data) {
    throw new Error('_post_message must be implemented by subclass');
  }
}
