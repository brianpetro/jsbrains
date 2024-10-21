import { SmartSources, SmartSource, SmartBlocks, SmartBlock } from "smart-sources";
import { render as chat_template } from "./components/threads.js";
import { render as settings_template } from "./components/settings.js";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json.js";

export class SmartThreads extends SmartSources {
  async init() {
    await this.fs.init();
    await this.chat_model.get_models(); // pre-load models for settings
  }
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + ".smart-env/chats"; }
  get fs() {
    if(!this._fs){
      this._fs = new this.env.opts.modules.smart_fs.class(this.env, {
        adapter: this.env.opts.modules.smart_fs.adapter,
        fs_path: this.data_folder,
      });
    }
    return this._fs;
  }
  get chat_model() {
    if (!this._chat_model) {
      this._chat_model = new this.env.opts.modules.smart_chat_model.class({
        settings: this.settings.chat_model,
        adapters: this.env.opts.modules.smart_chat_model.adapters,
        http_adapter: this.env.opts.modules.smart_chat_model.http_adapter,
        re_render_settings: this.render_settings.bind(this),
      });
    }
    return this._chat_model;
  }
  get chat_model_settings() {
    return this.settings?.chat_model?.[this.settings.chat_model?.platform_key || 'openai'];
  }
  async render(container=this.container, opts={}) {
    if(container && (!this.container || this.container !== container)) this.container = container;
    const frag = await chat_template.call(this.smart_view, this, opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return frag;
  }
  get render_settings_component() {
    return settings_template.bind(this.smart_view);
  }
  get container() { return this._container; }
  set container(container) { this._container = container; }
  get current() { return this._current; }
  set current(thread) { this._current = thread; }
  get default_settings() {
    return {
      chat_model: {
        platform_key: 'openai',
        openai: {
          model_key: 'gpt-4o',
        },
      },
      embed_model: {
        model_key: 'None',
      },
    };
  }
  get settings_config() {
    return this.process_settings_config(this.chat_model.settings_config, `chat_model`);
  }
}

import { render as thread_template } from "./components/thread.js";
export class SmartThread extends SmartSource {
  static get defaults() {
    return {
      data: {
        created_at: null,
        responses: {},
        messages: {},
      }
    }
  }

  get_key() {
    return this.data.created_at ? this.data.created_at : this.data.created_at = Date.now().toString();
  }

  get container() { return this._container; }
  set container(container) { this._container = container; }
  async render(container = this.container) {
    if(!container){
      container = this.collection.container.querySelector('.sc-chat-box');
    }
    if(!container) return console.warn("No container found for SmartThread");
    if(!this.container) this.container = container;
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

  get messages() { return Object.keys(this.data.messages || {}).map(key => this.env.smart_messages.get(key)); }

  // necessary source overrides
  get path() { return this.data.created_at; }


}

export class SmartMessages extends SmartBlocks {
  process_load_queue() {}
  process_import_queue() {}
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
  init() {}
}

import { render as message_template } from "./components/message.js";
export class SmartMessage extends SmartBlock {
  static get defaults() {
    return {
      data: {
        thread_key: null,
        content: null,
        role: null,
        tool_calls: null,
        tool_call_id: null,
        image_url: null,
        msg_i: null,
      }
    }
  }
  get_key() { return `${this.data.thread_key}#${this.data.msg_i}`; }
  async init() {
    while(!this.thread) await new Promise(resolve => setTimeout(resolve, 100)); // this shouldn't be necessary (why is it not working without this?)
    this.thread.data.messages[this.key] = true;
    await this.render();
    if(this.data.role === 'user') await this.thread.complete();
  }
  async render(container=this.thread.container) {
    const frag = await message_template.call(this.smart_view, this);
    if(container) container.appendChild(frag);
    return frag;
  }
  get content() { return this.data.content; }
  get role() { return this.data.role; }
  get thread() { return this.source; }
  // necessary source overrides
  get source_key() { return this.data.thread_key; }
  get source_collection() { return this.env.smart_threads; }
  get path() { return this.data.thread_key; }
}
