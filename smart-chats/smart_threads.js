import { SmartSources, SmartSource } from "smart-sources";
import { template } from "./components/_component.js";
import {template as settings_template} from "./components/settings.js";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json.js";

export class SmartThreads extends SmartSources {
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
  get data_fs() {
    if(!this._data_fs) {
      const config = this.env.opts.collections?.smart_threads;
      const _class = config?.class ?? config;
      this._data_fs = new _class(this.env, {
        adapter: config.adapter,
        fs_path: this.data_folder,
        exclude_patterns: [],
      });
    }
    return this._data_fs;
  }
  get fs() { return this.data_fs; } // TODO: if chat_history NOT json and history folder setting is set then use that as fs_path
  get chat_model() {
    if(!this._chat_model){
      const module_config = this.env.opts.modules.smart_chat_model;
      const _class = config?.class ?? module_config;
      this._chat_model = new _class({
        settings: this.settings.chat_model,
        adapters: module_config.adapters,
      });
    }
    return this._chat_model;
  }
  async render(container=this.container, thread=null) {
    if(this.component?.remove) this.component.remove(); // delete if exists (not settting null since not checked elsewhere)
    this.component = await template.call(this.env.smart_view, this, thread);
    container.empty().appendChild(this.component);
    this.thread_container = this.component.querySelector('.sc-chat-box');
    await this.thread.render(this.thread_container);
    return this.component;
  }
  async render_settings(container=this.settings_container) {
    if(!this.settings_container || this.settings_container !== container) this.settings_container = container;
    this.settings_container.empty();
    this.settings_container.innerHTML = '<div class="sc-loading">Loading settings...</div>';
    const frag = await settings_template.call(this.env.smart_view, this, this.settings_container);
    this.settings_container.empty();
    this.settings_container.appendChild(frag);
  }
  get container() { return this.opts.container; }
  set container(container) { this.opts.container = container; }
  get default_settings() {
    return {
      chat_model: {
        platform_key: 'openai',
        openai: {
          model_key: 'gpt-4o',
        },
      },
    };
  }
  get settings_config() {
    const chat_model_settings_config = Object.entries(this.chat_model.settings_config).reduce((acc, [key, val]) => {
      const new_key = 'chat_model.' + key;
      // string callback may be deprecated in favor of function
      // if(typeof val.callback === 'string') val.callback = 'chat_model.' + val.callback;
      // if(typeof val.options_callback === 'string') val.options_callback = 'chat_model.' + val.options_callback;
      if(typeof val.callback === 'string'){
        this[val.callback] = this.chat_model[val.callback].bind(this.chat_model);
      }
      if(typeof val.options_callback === 'string'){
        this[val.options_callback] = this.chat_model[val.options_callback].bind(this.chat_model);
      }
      acc[new_key] = val;
      return acc;
    }, {});
    return this.process_settings_config({
      // ...super.settings_config, // necessary?
      ...chat_model_settings_config,
      ...settings_config,
    });
  }
}

export const settings_config = {
  // TODO
}

import {template as thread_template} from "./components/thread.js";
export class SmartThread extends SmartSource {
  static get defaults() {
    return {
      data: {
        created_at: Date.now(),
        responses: {},
        turns: {},
        messages: {},
      }
    }
  }
  get_key() { return this.data.created_at; }
  async render(container=null) {
    if(this.component?.remove) this.component.remove(); // delete if exists (not settting null since not checked elsewhere)
    this.component = await thread_template.call(this.env.smart_view, this);
    if(container){
      container.empty();
      container.appendChild(this.component);
    }
    return this.component;
  }
  async new_response(response) {
    const {turns, messages} = await this.parse_response(response);
    await Promise.all(turns.map(turn => this.env.smart_turns.create_or_update(turn)));
    await Promise.all(messages.map(message => this.env.smart_messages.create_or_update(message)));
  }
  // "from chatml" (openai chat completion object) to DataAdapter format and Turn/Message instances
  // should always be converted to openai compatible format in Smart Chat Model (for now)
  async parse_response(response) { return await this.chat_data_adapter.parse_response(response); }
  async to_request() { return await this.chat_data_adapter.to_request(); }
  async complete() {
    const request = await this.to_request();
    const response = await this.chat_model.complete(request);
    await this.new_response(response);
  }
  // GETTERS
  get chat_data_adapter() {
    if(!this._chat_data_adapter) {
      this._chat_data_adapter = new SmartThreadDataOpenaiJsonAdapter(this);
    }
    return this._chat_data_adapter;
  }
  get chat_model() { return this.thread.chat_model; }
}

import { SmartBlocks, SmartBlock } from "smart-sources";

/**
 * SmartTurns
 * Mostly a placeholder for now since ChatML doesn't allow for
 * multiple same-role messages in a row.
 */
export class SmartTurns extends SmartBlocks {
  process_load_queue() {}
  process_import_queue() {}
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
}
import {template as turn_template} from "./components/turn.js";
export class SmartTurn extends SmartBlock {
  static get defaults() {
    return {
      data: {
        choice_index: 0,
        turn_index: 0,
        role: null,
        messages: {},
      }
    }
  }
  get_key() { return `${this.thread.key}#${this.data.turn_index}{${this.data.choice_index}}`; }
  get thread() { return this.source; }
  get role() { return this.data.role; }
  async init() {
    this.thread.data.turns[this.key] = true;
    if(this.data.tool_calls){
      // TODO handle tool calls
    }
  }
  async render(container=null) {
    if(this.component?.remove) this.component.remove(); // delete if exists (not settting null since not checked elsewhere)
    this.component = await turn_template.call(this.env.smart_view, this);
    if(container) container.appendChild(this.component);
    return this.component;
  }
}

export class SmartMessages extends SmartBlocks {
  process_load_queue() {}
  process_import_queue() {}
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
}

import {template as message_template} from "./components/message.js";
export class SmartMessage extends SmartBlock {
  static get defaults() {
    return {
      data: {
        choice_index: 0,
        turn_index: 0,
        content: null,
        tool_calls: null,
        tool_call_id: null,
        image_url: null,
      }
    }
  }
  get_key() { return `${this.thread.key}#${this.data.turn_index}{${this.data.choice_index}}`; }
  get turn() { return this.source; }
  get thread() { return this.turn.thread; }
  get role() { return this.turn.role; }
  async init() {
    this.thread.data.messages[this.key] = true;
    this.turn.data.messages[this.key] = true;
    if(this.role === 'user') await this.thread.complete();
  }
  async render(container=null) {
    if(this.component?.remove) this.component.remove(); // delete if exists (not settting null since not checked elsewhere)
    this.component = await message_template.call(this.env.smart_view, this);
    if(container) container.appendChild(this.component);
    return this.component;
  }
}