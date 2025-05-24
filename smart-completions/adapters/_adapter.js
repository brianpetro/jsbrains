import { insert_user_message } from "../utils/insert_user_message.js";

/**
 * @class SmartCompletionAdapter
 * @extends SmartCompletionAdapter
 *
 * This adapter checks `item.data.user` and, if present, appends it as a user message
 * to `completion.request.messages`.
 */
export class SmartCompletionAdapter {
  constructor(item) {
    this.item = item;
  }
  get data () {
    return this.item.data;
  }
  get env () {
    return this.item.env;
  }
  get completion () {
    return this.data.completion;
  }
  get request () {
    return this.item.data.completion.request;
  }
  get response () {
    return this.item.response;
  }
  insert_user_message(user_message) {
    insert_user_message(this.request, user_message);
  }

  // Override these methods in subclasses
  static get property_name() {
    return null;
  }
  /**
   * @returns {Promise<void>}
   */
  async to_request() {}

  /**
   * @returns {Promise<void>}
   */
  async from_response() {}
}