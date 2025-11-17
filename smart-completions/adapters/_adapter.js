import { insert_user_message } from "../utils/insert_user_message.js";

/**
 * @class SmartCompletionAdapter
 * @extends SmartCompletionAdapter
 */
export class SmartCompletionAdapter {
  static adapter_type = 'completion';
  static use_adapter (completion) {
    if (this.adapter_type !== 'completion') return false;
    if (this.property_name && !(this.property_name in completion.data)) return false;
    return true;
  }
  constructor(completion) {
    this.completion = completion;
  }
  get data () {
    return this.completion.data;
  }
  get env () {
    return this.completion.env;
  }
  get request () {
    return this.data.completion.request;
  }
  get response () {
    return this.completion.response;
  }
  insert_user_message(user_message, opts = {}) {
    insert_user_message(this.request, user_message, opts);
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
  /**
   * @deprecated Use `this.completion` instead.
   */
  get item () {
    return this.completion;
  }
}