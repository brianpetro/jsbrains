/**
 * @file smart_completion.js
 * @description
 * Represents a single completion request/response in the SmartCompletions collection.
 * Enhanced to run a set of "request adapters" that can transform the final request
 * (e.g., building ephemeral context or adding function calls).
 */

import { CollectionItem } from "smart-collections";
import { murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";
import { parse_xml_fragments } from "smart-utils/parse_xml_fragments.js";
import { run_adapters } from "./utils/run_adapters.js";

/**
 * @class SmartCompletion
 * @extends CollectionItem
 * @description
 * Represents a single completion request/response in the SmartCompletions collection.
 *
 * Data shape (typical):
 * {
 *   completion: {
 *     request: {},
 *     responses: [],
 *     chat_model: null
 *   },
 *   // other item-level properties...
 * }
 */
export class SmartCompletion extends CollectionItem {
  constructor(env, data = null) {
    super(env, data);
    this.run_adapter_item_constructors();
  }

  run_adapter_item_constructors(){
    for (const [key, AdapterClass] of Object.entries(this.completion_adapters)) {
      AdapterClass.item_constructor?.(this);
    }
  }
  /**
   * Default data structure for a new SmartCompletion item.
   * @static
   * @returns {Object}
   */
  static get defaults() {
    return {
      response_i: 0,
      data: {
        completion: {
          request: {},
          responses: [],
          chat_model: null
        }
      }
    };
  }

  /**
   * get_key
   * Overridden to produce a unique key based on a hash of this.data plus the current timestamp.
   * @returns {string}
   */
  get_key() {
    const hash = murmur_hash_32_alphanumeric(JSON.stringify(this.data));
    const ts = Date.now();
    return `${hash}-${ts}`;
  }

  /**
   * Called automatically in many cases (via create_or_update).
   * You can also call it manually if needed.
   */
  async init(completion_opts={}) {
    // instance in data causes validation error
    // pass chat model instance directly to completion
    if(this.data.chat_model_config){
      this.chat_model = this.env.init_module('smart_chat_model', {
        settings: this.data.chat_model_config,
      });
    }
    await this.build_request();
    await this.complete(completion_opts);
    await this.parse_response();
    this.queue_save();
    this.collection.process_save_queue();
  }

  /**
   * Collects or transforms data into a final `completion.request` structure
   * by running any applicable completion adapters.
   * @returns {Promise<void>}
   */
  async build_request() {
    this.data.completion.request = {};
    await run_adapters({ item: this, adapters: this.completion_adapters, adapter_method: "to_request" });
    // clean-up and merge messages
    if(Object.keys(this.data.completion.request).length > 0) {
      this.data.completion.request.messages = this.data.completion.request.messages
        .map(msg => {
          if (typeof msg.content === 'string' && msg.content.trim().length === 0) return null; // remove empty strings
          if(Array.isArray(msg.content)) {
            msg.content = msg.content.filter(part => {
              if(part.type !== 'text') return true; // keep non-text parts
              if(part.text && part.text.trim().length > 0) return true; // keep non-empty text
              return false; // remove empty text parts
            });
            if(msg.content.length === 0) return null; // remove empty arrays
          }
          return msg; // keep non-null messages
        })
        .filter(msg => msg !== null); // remove null messages
      ;
    }
    return this.data.completion.request;
  }
  async parse_response(){
    await run_adapters({ item: this, adapters: this.completion_adapters, adapter_method: "from_response" });
    return this.data.completion.responses;
  }

  /**
   * Calls the underlying chat model, stores the response in completion.responses.
   * @returns {Promise<void>}
   */
  async complete(opts={}) {
    this.emit_event('completion:completing', {raw: ''});
    if (!this.data.completion || !this.data.completion.request) {
      console.warn("No completion.request found, skipping complete().");
      return;
    }
    const chat_model = this.get_chat_model(opts);
    if (!chat_model) {
      console.warn("No chat model available for SmartCompletion. Check environment config.");
      return;
    }
    this.data.completion.chat_model = {
      model_key: chat_model.model_key,
      platform_key: chat_model.adapter_name,
    };
    try {
      const request_payload = this.data.completion.request;
      const stream = opts.stream;// && request_payload.tool_choice?.type !== 'function';
      const result = stream
        ? await chat_model.stream(request_payload, this.stream_handlers(opts.stream_handlers)) 
        : await chat_model.complete(request_payload)
      ;
      // console.log("SmartCompletion.complete(): received result", result);
      if(!stream) this.emit_event('completion:completed');
      // Store response
      if(!stream){
        this.data.completion.responses.push({
          timestamp: Date.now(),
          ...result
        });
      }
      this.queue_save();
    } catch (err) {
      console.error("Error in SmartCompletion.complete():", err);
    }
  }
  stream_handlers(stream_handlers={}){
    return {
      chunk: async (resp) => {
        // console.log('chunk', resp);
        this.data.completion.responses[0] = {
          timestamp: Date.now(),
          ...resp
        }
        const raw = resp.raw;
        // console.log({raw})
        this.emit_event('completion:completing', {raw});
        await stream_handlers.chunk?.(this);
      },
      done: async (resp) => {
        // console.log('done', resp);
        this.data.completion.responses[0] = {
          timestamp: Date.now(),
          ...resp
        }
        this.emit_event('completion:completed');
        await stream_handlers.done?.(this);
      },
      error: async (err) => {
        console.error('error', err);
        this.emit_event('completion:error', { error: err.message });
        await stream_handlers.error?.(err);
      }
    }
  }

  /**
   * Access the completion adapters from the parent collection, if any.
   */
  get completion_adapters() {
    return this.collection?.completion_adapters || {};
  }

  /**
   * If a local chat_model config is present, creates a dedicated instance.
   * Otherwise, returns the collection-level chat_model or null.
   * @returns {Object|null}
   */
  get_chat_model() {
    if(this.chat_model){
      return this.chat_model;
    }
    else{
      console.log('no chat_model, using collection chat_model');
      return this.collection?.chat_model || null;
    }
  }

  /**
   * @returns {Object|undefined} Currently selected response based on `response_i`.
   */
  get response() {
    return this.data.completion.responses[this.response_i];
  }
  /**
   * @method response_text
   * @returns {string} The best guess at the main text from the model's first response.
   */
  get response_text() {
    const resp = this.response;
    if (!resp) return '';
    if (Array.isArray(resp.choices) && resp.choices[0]) {
      const choice = resp.choices[0];
      if (choice.message && choice.message.content) {
        return choice.message.content;
      }
      if (choice.text) return choice.text;
    }
    // fallback
    if (resp.text) return resp.text;
    return '';
  }
  get response_structured_output(){
    if (!this.response) return null;
    // if tool call, return structured output
    if(this.action_call){
      try{
        const parsed = JSON.parse(this.action_call);
        return parsed;
      }catch(e){
        console.log("failed to parse tool_call in response_structured_output");
      }
    }
    if (!this.response_text) return null;
    const parsed = parse_xml_fragments(this.response_text);
    if (!parsed) return null;
    return parsed;
  }
  get action_call(){
    const resp = this.response;
    if (!resp) return null;
    return resp.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  }
  get messages(){
    const messages = [];
    if(this.data.system_message){
      messages.push({
        role: 'system',
        content: this.data.system_message
      });
    }
    if(this.data.user_message){
      messages.push({
        role: 'user',
        content: this.data.user_message
      });
    }
    if(this.response_text){
      messages.push({
        role: 'assistant',
        content: this.response_text
      });
    }
    return messages;
  }

  get is_completed() {
    return this.data.completion.responses.length > 0;
  }

  /**
   * Toggle or force a Smart Action for this completion.
   * Ensures only a single forced action is active at a time.
   * @param {string} action_key
   * @param {{active?: boolean, force?: boolean}} opts
   */
  use_action(action_key, opts = {}) {
    if (!action_key) return;
    this.data.smart_actions ??= {};
    const current_state = this.data.smart_actions[action_key] || {};
    const next_state = {
      active: true,
      force: false,
      ...current_state,
      ...opts
    };

    if (next_state.force) {
      for (const key of Object.keys(this.data.smart_actions)) {
        if (key === action_key) continue;
        if (this.data.smart_actions[key]?.force) {
          this.data.smart_actions[key].force = false;
        }
      }
    }

    this.data.smart_actions[action_key] = next_state;

    this.emit_event('completion:actions-updated', {
      item_key: this.key,
      action_key,
      active: Boolean(next_state.active),
      force: Boolean(next_state.force)
    });

    this.queue_save();
    this.collection?.process_save_queue?.();
  }


}
