import { SmartCompletionAdapter } from './_adapter.js';

/**
 * @class SmartCompletionSystemAdapter
 * @extends SmartCompletionAdapter
 * @description
 * Checks `item.data.system_message` and, if present, inserts a system role message
 * at the start of the request's messages array.
 */
export class SmartCompletionSystemAdapter extends SmartCompletionAdapter {
  /**
   * Identifies the data property that triggers this adapter.
   * @returns {string}
   */
  static get property_name() {
    return 'system_message';
  }

  /**
   * to_request: If `data.system_message` is present, prepends a system message to request.messages.
   * @returns {Promise<void>}
   */
  async to_request() {
    const sys_msg = this.data.system_message;
    if (!sys_msg) return;
    if (!this.request.messages) {
      this.request.messages = [];
    }
    // Prepend the system message
    this.request.messages.unshift({
      role: 'system',
      content: sys_msg
    });
  }

  /**
   * from_response: No post-processing needed here.
   * @returns {Promise<void>}
   */
  async from_response() {}
}
