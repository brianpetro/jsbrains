import { SmartCompletionAdapter } from './_adapter.js';
/**
 * @class SmartCompletionUserAdapter
 * @extends SmartCompletionAdapter
 *
 * This adapter checks `item.data.user` and, if present, appends it as a user message
 * to `completion.request.messages`.
 */
export class SmartCompletionUserAdapter extends SmartCompletionAdapter {
  static order = 1;
  /**
   * @returns {string}
   */
  static get property_name() {
    return 'user_message';
  }
  get request () {
    return this.item.data.completion.request;
  }
  /**
   * to_request: Checks `data.user`, adds a user message to `request.messages`.
   * @returns {Promise<void>}
   */
  async to_request() {
    const user_message = this.data.user_message;
    const new_user_message = this.data.new_user_message;
    this.insert_user_message(user_message, {
      position: 'start', // always at start so that other adapters may add again to end (e.g. context adapter)
      new_user_message
    });
  }

  /**
   * from_response: No post-processing needed for default user message.
   * @returns {Promise<void>}
   */
  async from_response() {}
}
