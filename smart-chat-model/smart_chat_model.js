// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const adapters = require('./adapters');
const platforms = require('./platforms.json');
const { is_valid_tool_call } = require('./utils/is_valid_tool_call');
const { SmartStreamer } = require('./streamer');
const fetch_models = require("./models/fetch");
/**
 * SmartChatModel class provides functionalities to handle chat interactions with various models and adapters.
 * It supports streaming and non-streaming responses, tool calls, and customizations through options.
 */
class SmartChatModel {
  /**
   * Constructs an instance of SmartChatModel with specified environment, model key, and options.
   * @param {Object} main - The main environment context, typically containing configurations and state.
   * @param {string} platform_key - Key to select the specific model configuration from models.json.
   * @param {Object} model_config - Optional parameters to override model configurations.
   */
  constructor(main, platform_key, model_config={}) {
    this.env = main;
    this.main = this.env; // DEPRECATED
    this.config = {
      ...(platforms[platform_key] || {}),
      ...model_config, // override default platform config
    }
    console.log(JSON.stringify(this.config));
    this.platform_key = platform_key;
    this.active_stream = null;
    this._request_adapter = null;
    this.platforms = platforms;
    if(this.config.adapter) this.adapter = new adapters[this.config.adapter](this);
    if(this.adapter) console.log("has chat model adapter");
  }
  static get models() { return platforms; } // DEPRECATED (confusing name)
  // 
  static get platforms() {
    return Object.keys(platforms).map(key => ({
      key,
      ...platforms[key],
    }));
  }
  get platform() { return platforms[this.platform_key]; }
  get default_opts() {
    return {
      temperature: 0.3,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      n: 1,
      model: this.model_name,
      max_tokens: this.max_output_tokens,
    };
  }
  async request_middlewares(opts) { return opts; }
  /**
   * Completes the chat interaction by processing the provided options, making an API request, and handling the response.
   * This method supports both streaming and non-streaming responses, and can handle tool calls if specified in the response.
   *
   * @param {Object} opts - The options for the chat completion which may include settings like temperature, max tokens, etc.
   * @param {boolean} render - Flag to determine if the response should be rendered in the UI.
   * @returns {Promise<string|void>} - Returns the chat response content or handles tool outputs recursively. In case of errors, it may return an error message.
   */
  async complete(opts={}, render=true) {
    if(!this.base_model_config){
      this.base_model_config = await this.get_base_model_config();
      this.config = {
        ...this.base_model_config,
        ...this.config,
      };
    }
    opts = {
      ...this.default_opts,
      messages: (await this.current?.get_chat_ml())?.messages || [],
      ...opts,
    };
    if(opts.stream !== false && this.config.streaming && !this.current?.tool_choice) opts.stream = true; // no streaming if tool_choice is set
    else opts.stream = false;
    opts = await this.request_middlewares(JSON.parse(JSON.stringify(opts)));
    const req = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.api_key}`
      },
      method: "POST",
    };
    if (this.config.headers) req.headers = { ...req.headers, ...this.config.headers };
    if (this.config.api_key_header) {
      if(this.config.api_key_header !== 'none') req.headers[this.config.api_key_header] = this.api_key;
      delete req.headers.Authorization;
    }
    // body constant stores chatml for later
    const body = typeof this.env.actions?.prepare_request_body === 'function' ? this.env.actions.prepare_request_body(opts) : { ...opts };
    // adapter can modify body based on platform
    req.body = JSON.stringify(typeof this.adapter?.prepare_request_body === 'function' ? this.adapter.prepare_request_body(body) : body);
    console.log(req);
    try {
      if(opts.stream) return await this.stream(req);
      // HANDLE NON-STREAMING (includes all function calls)
      const resp_json = await this.request(req);
      if(resp_json.error) {
        console.error(resp_json.error);
        if(render) this.done_handler("*API Error. See console logs for details.*");
        return;
      }
      // if is tool_call, handle tool_call and return
      const tool_call = this.get_tool_call(resp_json);
      if(tool_call){
        if(this.env.chats?.current?.tool_choice) this.env.chats.current.tool_choice = null; // IMPORTANT: prevent infinite loop
        // if (this.current.tool_choice !== "auto") this.current.tool_choice = null; // remove tool_choice from current if not auto (prevent infinite loop)
        const tool_name = this.get_tool_name(tool_call);
        const tool_call_content = this.get_tool_call_content(tool_call);
        const tool = body.tools.find((t) => t.function.name === tool_name); // platform-agnostic
        if(is_valid_tool_call(tool, tool_call_content)){
          if(typeof this.current?.add_message === 'function'){
            await this.current.add_message({ role: 'assistant', tool_calls: [{
              function: {
                name: tool_name,
                arguments: JSON.stringify(tool_call_content),
              }
            }]});
          }
          const tool_handler = this.get_tool_handler(tool_name);
          if(!tool_handler) {
            console.warn(`Tool ${tool_name} not found, returning tool_call_content`);
            console.log({tool_call_content});
            return tool_call_content;
          }
          const tool_output = await tool_handler(this.env, tool_call_content);
          if(tool_output) {
            await this.current.add_tool_output(tool_name, tool_output);
            this.current.tool_choice = 'none'; // prevent subsequent fx_call from preventing completion
            return this.complete({});
          }
        }else{
          // DO: use tool specs to coerce tool_call to match tool.function.parameters
          console.error(`Invalid tool call: ${tool_call}`);
          if(render) this.done_handler("*Invalid tool call. See console logs for details.*");
          return "*Invalid tool call. See console logs for details.*";
        }
      }

      if(render) this.done_handler(this.get_message_content(resp_json));
      return this.get_message_content(resp_json);
      // console.log(response);
    } catch (err) {
      console.error(err);
      // new Notice(`Smart Connections API Error :: ${err}`);
    }
  }
  // HANDLE TOOLS
  /**
   * Retrieves the tool handler function based on the tool name from the environment's actions.
   * This method can be overridden to use custom logic for handling tools.
   * 
   * @param {string} tool_name - The name of the tool for which the handler is to be retrieved.
   * @returns {Function} The handler function for the specified tool.
   */
  get_tool_handler(tool_name) { return this.env.actions?.actions?.[tool_name]?.handler; }

  /**
   * Extracts the tool call information from a JSON response. This method supports adapter-specific logic.
   * If no adapter method is provided, it defaults to the expected OpenAI JSON format.
   * 
   * @param {Object} json - The JSON response from which to extract the tool call.
   * @returns {Object} The first tool call found in the response.
   */
  get_tool_call(json) {
    if(typeof this.adapter?.get_tool_call === 'function') return this.adapter.get_tool_call(json);
    return json.choices?.[0].message.tool_calls?.[0]; // OpenAI format
  } 

  /**
   * Determines the tool name from a tool call object. Supports adapter-specific implementations.
   * Defaults to extracting the name directly from the tool call structure.
   * 
   * @param {Object} tool_call - The tool call object from which to extract the tool name.
   * @returns {string} The name of the tool.
   */
  get_tool_name(tool_call) {
    if(typeof this.adapter?.get_tool_name === 'function') return this.adapter.get_tool_name(tool_call);
    return tool_call.function.name;
  }

  /**
   * Extracts the tool call content from a tool call object. Supports adapter-specific logic.
   * Defaults to parsing the 'arguments' field of the tool call function as JSON.
   * 
   * @param {Object} tool_call - The tool call object from which to extract the content.
   * @returns {Object} The parsed arguments of the tool call.
   */
  get_tool_call_content(tool_call) {
    if(typeof this.adapter?.get_tool_call_content === 'function') return this.adapter.get_tool_call_content(tool_call);
    return JSON.parse(tool_call.function.arguments);
  }

  // HANDLE MESSAGES
  /**
   * Retrieves the message object from a JSON response. Supports adapter-specific implementations.
   * Defaults to handling both OpenAI and Ollama formats by checking for message structures in 'choices'.
   * 
   * @param {Object} json - The JSON response from which to extract the message.
   * @returns {Object} The message object extracted from the response.
   */
  get_message(json) {
    if(typeof this.adapter?.get_message === 'function') return this.adapter.get_message(json);
    return json.choices?.[0].message || json.message; // supports OpenAI and Ollama
  }

  /**
   * Extracts the content of a message from a JSON response. Supports adapter-specific implementations.
   * This method relies on `get_message` to first retrieve the message object.
   * 
   * @param {Object} json - The JSON response from which to extract the message content.
   * @returns {string} The content of the message.
   */
  get_message_content(json) {
    if(typeof this.adapter?.get_message_content === 'function') return this.adapter.get_message_content(json);
    return this.get_message(json).content;
  }

  async request(req){
    req.url = this.endpoint;
    req.throw = false;
    // handle fallback to fetch (allows for overwriting in child classes)
    const resp = this._request_adapter ? await this._request_adapter(req) : await fetch(this.endpoint, req);
    console.log(resp);
    const resp_json = await this.get_resp_json(resp);
    console.log(resp_json);
    return resp_json;
  }
  async get_resp_json(resp) { return (typeof resp.json === 'function') ? await resp.json() : await resp.json; }
  get request_adapter(){ return this._request_adapter; }

  async stream(req) {
    console.log("Streaming Request: ");
    console.log(req);
    const full_text = await new Promise((resolve, reject) => {
      try {
        // console.log("stream", opts);
        this.active_stream = new SmartStreamer(this.endpoint_streaming, req);
        let curr_text = "";
        this.active_stream.addEventListener("message", (e) => {
          if(this.is_end_of_stream(e)) {
            this.stop_stream();
            return resolve(curr_text);
          }
          let text_chunk = this.get_text_chunk_from_stream(e);
          if(!text_chunk) return;
          curr_text += text_chunk;
          this.chunk_handler(text_chunk); // call the chunk handler if it exists
        });
        // unnecessary?
        this.active_stream.addEventListener("readystatechange", (e) => {
          if (e.readyState >= 2) console.log("ReadyState: " + e.readyState);
        });
        this.active_stream.addEventListener("error", (e) => {
          console.error(e);
          this.done_handler("*API Error. See console logs for details.*");
          this.stop_stream();
          reject(e);
        });
        this.active_stream.stream();
      } catch (err) {
        console.error(err);
        this.stop_stream();
        reject(err);
      }
    });
    this.done_handler(full_text); // handled in complete()
    return full_text;
  }
  get_text_chunk_from_stream(event) {
    if(typeof this.adapter?.get_text_chunk_from_stream === 'function') return this.adapter.get_text_chunk_from_stream(event);
    let resp = null;
    let text_chunk = '';
    // DO: is this try/catch still necessary?
    try {
      resp = JSON.parse(event.data);
      text_chunk = resp.choices[0].delta.content;
    } catch (err) {
      console.log(err);
      console.log(event.data);
      if (event.data.indexOf('}{') > -1) event.data = event.data.replace(/}{/g, '},{');
      resp = JSON.parse(`[${event.data}]`);
      resp.forEach((r) => {
        if (r.choices) text_chunk += r.choices[0].delta.content;
      });
    }
    return text_chunk;
  }
  is_end_of_stream(event) {
    if(typeof this.adapter?.is_end_of_stream === 'function') return this.adapter.is_end_of_stream(event);
    return event.data === "[DONE]"; // use default OpenAI format
  }

  stop_stream() {
    if (this.active_stream) {
      this.active_stream.end();
      this.active_stream = null;
    }
  }
  done_handler(full_str) {
    // Should handle:
    // 1. Add message to current chat history
    // 2. Update chat UI
    if(typeof this.main.done_handler === 'function') this.main.done_handler(full_str);
  }
  chunk_handler(text_chunk) {
    // Should handle:
    // 1. Update chat UI
    if(typeof this.main.chunk_handler === 'function') this.main.chunk_handler(text_chunk);
  }
  async count_tokens(input) {
    if(typeof this.adapter?.count_tokens === 'function') return await this.adapter.count_tokens(input);
    return this.estimate_tokens(input);
  }
  estimate_tokens(input) {
    if(typeof this.adapter?.estimate_tokens === 'function') return this.adapter.estimate_tokens(input);
    if(typeof input === 'object') input = JSON.stringify(input);
    return input.length / 4;
  }
  async test_api_key() {
    console.log(this.api_key);
    try{
      const request = {
        messages: [
          { role: "user", content: "Hello" },
        ],
        temperature: 0,
        max_tokens: 100,
        stream: false,
        n: 1,
      };
      if(this.config.fetch_models) {
        request.model = this.config.default_model;
      }
      const resp = await this.complete(request, false);
      console.log(resp);
      if(!resp) return false;
      return true;
    }catch(err){
      console.error(err);
      return false;
    }
  }
  async get_models() {
    if(!this.api_key){
      console.warn(`No API key found for ${this.platform_key}. Cannot retrieve models.`);
      return [];
    }
    // const fx_name = this.plugin.settings.chat_model_platform_key;
    if(this.platforms[this.platform_key]?.fetch_models && typeof fetch_models[this.platform_key] === "function"){
      const models = await fetch_models[this.platform_key](this.api_key, this._request_adapter);
      if(models) {
        // sort alphabetically by model name
        models.sort((a, b) => a.model_name.localeCompare(b.model_name));
        return models;
      }else console.error(`No models found for ${this.platform_key}`, models);
    }
    return [];
  }
  async get_base_model_config() {
    const models = await this.get_models();
    return models.find((m) => m.key === this.model_name);
  }
  // getters
  get api_key() { return this.config.api_key; }
  get current() { return this.env.chats?.current; }
  // use endpoint of combine protocol, hostname, port, and path
  get endpoint() {
    if(typeof this.adapter?.endpoint !== 'undefined') return this.adapter.endpoint.replace('MODEL_NAME', this.model_name);
    return this.config.endpoint || this.config.protocol + "://" + this.config.hostname + (this.config.port ? ":" + this.config.port : "") + this.endpoint_path;
  }
  get endpoint_streaming() {
    if(typeof this.adapter?.endpoint_streaming !== 'undefined') return this.adapter.endpoint_streaming.replace('MODEL_NAME', this.model_name);
    return this.config.endpoint_streaming || this.endpoint;
  }
  get endpoint_path() { return this.config.path.startsWith('/') ? this.config.path : '/' + this.config.path; }
  get max_input_tokens() { return this.config.max_input_tokens; }
  get max_output_tokens() { return this.config.max_output_tokens; }
  get model_name() { return this.config.model_name || this.config.default_model; }
  get multimodal() { return typeof this.adapter?.multimodal !== 'undefined' ? this.adapter.multimodal : this.config.multimodal; }
}
exports.SmartChatModel = SmartChatModel;

