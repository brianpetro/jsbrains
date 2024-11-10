import { SmartSource } from "smart-sources";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json";
import { render as thread_template } from "./components/thread";

/**
 * @class SmartThread
 * @extends SmartSource
 * @description Represents a single chat thread, managing messages and interactions with the AI model
 */
export class SmartThread extends SmartSource {
  /**
   * @static
   * @property {Object} defaults - Default configuration for a new thread
   */
  static get defaults() {
    return {
      data: {
        created_at: null,
        responses: {},
        messages: {},
      }
    };
  }

  /**
   * Generates a unique key for the thread based on creation timestamp
   * @returns {string} Unique thread identifier
   */
  get_key() {
    return this.data.created_at ? this.data.created_at : this.data.created_at = Date.now().toString();
  }

  /**
   * Renders the thread interface
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @returns {DocumentFragment} Rendered thread interface
   */
  async render(container = this.container) {
    if (!container) {
      container = this.collection.container.querySelector('.sc-chat-box');
    }
    if (!container) return console.warn("No container found for SmartThread");
    if (!this.container) this.container = container;
    const frag = await thread_template.call(this.smart_view, this);
    if (container) {
      container.empty();
      container.appendChild(frag);
    }
    return frag;
  }

  /**
   * Handles sending a user message from the UI
   * @async
   */
  async handle_send() {
    try {
      // Access the chat input textarea from the UI
      const input_field = this.container.querySelector('.sc-chat-input');
      const message_content = input_field.value.trim();

      // Validate input
      if (!message_content) {
        // Optionally, provide user feedback for empty input
        console.warn("Cannot send empty message.");
        return;
      }

      // Create and add the user message
      await this.new_user_message(message_content);

      // Clear the input field
      input_field.value = '';

      // Scroll to the latest message
      this.container.scrollTop = this.container.scrollHeight;

    } catch (error) {
      console.error("Error in handle_send:", error);
    }
  }

  /**
   * Creates a new user message and adds it to the thread
   * @async
   * @param {string} content - The content of the user's message
   */
  async new_user_message(content) {
    this.collection.current = this;
    try {
      const new_msg_data = {
        thread_key: this.key,
        content: content,
        role: 'user',
        msg_i: Object.keys(this.data.messages || {}).length + 1,
      };
      // Create a new SmartMessage for the user's message
      await this.env.smart_messages.create_or_update(new_msg_data);
    } catch (error) {
      console.error("Error in new_user_message:", error);
    }
  }

  /**
   * Processes and adds an AI response to the thread
   * @async
   * @param {Object} response - Raw response from the AI model
   */
  async new_response(response) {
    const { messages } = await this.parse_response(response);
    const msg_i = Object.keys(this.data.messages || {}).length + 1;
    const msg_items = await Promise.all(messages.map(message => this.env.smart_messages.create_or_update({
      ...message,
      thread_key: this.key,
      msg_i,
    })));
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Parses an AI response using the thread's data adapter
   * @async
   * @param {Object} response - Raw response from the AI model
   * @returns {Object} Parsed response data
   */
  async parse_response(response) {
    return await this.chat_data_adapter.parse_response(response);
  }

  /**
   * Prepares the request payload for the AI model
   * @async
   * @returns {Object} Formatted request payload
   */
  async to_request() {
    return await this.chat_data_adapter.to_request();
  }

  /**
   * Sends the current thread state to the AI model and processes the response
   * @async
   */
  async complete() {
    const request = await this.to_request();
    const response = await this.chat_model.complete(request);
    await this.new_response(response);
  }

  /**
   * @property {SmartChatDataAdapter} chat_data_adapter - Adapter for data format conversions
   * @readonly
   */
  get chat_data_adapter() {
    if (!this._chat_data_adapter) {
      this._chat_data_adapter = new SmartThreadDataOpenaiJsonAdapter(this);
    }
    return this._chat_data_adapter;
  }

  /**
   * @property {Object} chat_model - The AI chat model instance
   * @readonly
   */
  get chat_model() { return this.collection.chat_model; }

  /**
   * @property {HTMLElement} container - Container element for the thread UI
   */
  get container() { return this._container; }
  set container(container) { this._container = container; }

  /**
   * @property {Array<SmartMessage>} messages - All messages in the thread
   * @readonly
   */
  get messages() { return Object.keys(this.data.messages || {}).map(key => this.env.smart_messages.get(key)); }

  /**
   * @property {string} path - Path identifier for the thread
   * @readonly
   */
  get path() { return this.data.created_at; }
}
