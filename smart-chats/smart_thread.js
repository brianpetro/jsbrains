import { SmartSource } from "smart-sources";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json";
import { thread_template } from "./components/thread";

export class SmartThread extends SmartSource {
  static get defaults() {
    return {
      data: {
        created_at: null,
        responses: {},
        messages: {},
      }
    };
  }

  get_key() {
    return this.data.created_at ? this.data.created_at : this.data.created_at = Date.now().toString();
  }
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
   * Handles sending a user message.
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
   * Creates a new user message and adds it to the thread.
   * @param {string} content - The content of the user's message.
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

  async parse_response(response) {
    return await this.chat_data_adapter.parse_response(response);
  }

  async to_request() {
    return await this.chat_data_adapter.to_request();
  }

  async complete() {
    const request = await this.to_request();
    const response = await this.chat_model.complete(request);
    await this.new_response(response);
  }

  get chat_data_adapter() {
    if (!this._chat_data_adapter) {
      this._chat_data_adapter = new SmartThreadDataOpenaiJsonAdapter(this);
    }
    return this._chat_data_adapter;
  }
  get chat_model() { return this.collection.chat_model; }
  get container() { return this._container; }
  set container(container) { this._container = container; }

  get messages() { return Object.keys(this.data.messages || {}).map(key => this.env.smart_messages.get(key)); }

  // necessary source overrides
  get path() { return this.data.created_at; }


}
