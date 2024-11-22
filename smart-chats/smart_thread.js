import { SmartSource } from "smart-sources";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json";
import { render as thread_template } from "./components/thread.js";

/**
 * @class SmartThread
 * @extends SmartSource
 * @description Represents a single chat thread. Manages message history, handles user interactions,
 * coordinates with AI models, and maintains thread state. Supports real-time UI updates and
 * message context management.
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
  async render(container = this.container, opts = {}) {
    const frag = await thread_template.call(this.smart_view, this, opts);
    if (container) {
      container.empty();
      // if container is sc-thread, replace it with the frag
      if (container.classList.contains('sc-thread')) {
        container.replaceWith(frag);
      } else {
        container.appendChild(frag);
      }
    }
    return frag;
  }

  /**
   * Creates a new user message and adds it to the thread
   * @async
   * @param {string} content - The content of the user's message
   */
  async handle_message_from_user(content) {
    try {
      const msg_i = Object.keys(this.data.messages || {}).length + 1;
      const new_msg_data = {
        thread_key: this.key,
        content: content,
        role: 'user',
        msg_i,
        id: `user-${msg_i}`,
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
  async handle_message_from_chat_model(response, opts = {}) {
    console.log('handle_message_from_chat_model', response);
    const choices = response.choices;
    const id = response.id;
    const msg_i = Object.keys(this.data.messages || {}).length + 1; // +1 accounts for initial message (also 1 indexes messages)
    const msg_items = await Promise.all(choices.map(choice => this.env.smart_messages.create_or_update({
      ...(choice?.message || choice), // fallback on full choice to handle non-message choices
      thread_key: this.key,
      msg_i,
      id,
    })));
    return msg_items;
  }

  /**
   * Prepares the request payload for the AI model
   * @async
   * @returns {Object} Formatted request payload
   */
  async to_request() {
    const request = { messages: [] };
    for(const msg of this.messages){
      if(msg.role === 'user') {
        request.messages.push(
          ...(await msg.get_message_with_context()) // returns array of messages
        );
        continue;
      }
      const _msg = {
        role: msg.role,
      };
      if (msg.data.content) _msg.content = msg.content;
      if (msg.data.tool_calls) _msg.tool_calls = msg.data.tool_calls;
      if (msg.data.tool_call_id) _msg.tool_call_id = msg.data.tool_call_id;
      if (msg.data.image_url) _msg.image_url = msg.data.image_url;
      request.messages.push(_msg);
    }
    return request;
  }

  /**
   * Sends the current thread state to the AI model and processes the response
   * @async
   */
  async complete() {
    const request = await this.to_request();
    if (this.chat_model.can_stream) {
      await this.chat_model.stream(request, {
        chunk: this.chunk_handler.bind(this),
        done: this.done_handler.bind(this),
        error: this.error_handler.bind(this),
      });
    } else {
      const response = await this.chat_model.complete(request);
      this.data.responses[response.id] = response;
      await this.handle_message_from_chat_model(response);
    }
  }
  /**
   * @description
   *  - renders the message
   */
  async chunk_handler(response) {
    const msg_items = await this.handle_message_from_chat_model(response);
    await msg_items[0].render();
  }
  /**
   * @description
   *  - different from chunk_handler in that it calls init() instead of render()
   * 	- allows handling tool-calls in `message.init()`
   */
  async done_handler(response) {
    const msg_items = await this.handle_message_from_chat_model(response);
    this.data.responses[response.id] = response;
    await msg_items[0].init(); // runs init() to trigger tool_call handlers
  }
  error_handler(error) {
    console.error('error_handler', error);
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
  get container() {
    return this.collection.container.querySelector('.sc-thread');
  }

  get messages_container() { return this.container.querySelector('.sc-message-container'); }
  /**
   * @property {Array<SmartMessage>} messages - All messages in the thread
   * @readonly
   */
  get messages() { return Object.keys(this.data.messages || {}).map(key => this.env.smart_messages.get(this.key + '#' + key)); }

  /**
   * @property {string} path - Path identifier for the thread
   * @readonly
   */
  get path() { return this.data.created_at; }

  /**
   * Processes base64 encoding for image files
   * @async
   * @param {string} file_path - Path to the image file
   * @returns {string} Base64 encoded image data URL
   */
  async process_image_to_base64(file_path) {
    const file = this.env.smart_connections_plugin?.app.vault.getFileByPath(file_path);
    if (!file) return null;
    
    const base64 = await this.env.smart_sources.fs.read(file.path, 'base64');
    return `data:image/${file.extension};base64,${base64}`;
  }
}
