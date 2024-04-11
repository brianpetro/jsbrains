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
const chat_models = require('./models.json');
const { is_valid_tool_call } = require('./utils/is_valid_tool_call');
const { SmartStreamer } = require('./streamer');
class SmartChatModel {
  constructor(main, model_key, opts={}) {
    this.env = main;
    this.main = this.env; // DEPRECATED
    this.config = {
      ...chat_models[model_key], // from chat_models.json
      ...opts, // user opts (overwrites model_config)
    }
    this.active_stream = null;
    this._request_adapter = null;
    this.models = chat_models;
    if(this.config.adapter) this.adapter = new adapters[this.config.adapter](this);
    console.log(this.adapter);
  }
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
  async complete(opts={}, render=true) {
    opts = {
      ...this.default_opts,
      messages: (await this.current.get_chat_ml())?.messages || [],
      ...opts,
    };
    if(opts.stream !== false && this.config.streaming && !this.current.tool_choice) opts.stream = true; // no streaming if tool_choice is set
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
        this.env.chats.current.tool_choice = null; // IMPORTANT: prevent infinite loop
        // if (this.current.tool_choice !== "auto") this.current.tool_choice = null; // remove tool_choice from current if not auto (prevent infinite loop)
        const tool_name = this.get_tool_name(tool_call);
        const tool_call_content = this.get_tool_call_content(tool_call);
        const tool = body.tools.find((t) => t.function.name === tool_name); // platform-agnostic
        if(is_valid_tool_call(tool, tool_call_content)){
          await this.current.add_message({ role: 'assistant', tool_calls: [tool_call] });
          const tool_handler = this.get_tool_handler(tool_name);
          if(!tool_handler) return console.error(`Tool ${tool_name} not found`);
          const tool_output = await tool_handler(tool_call_content);
          if(tool_output) {
            await this.current.add_tool_output(tool_name, tool_output);
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
  get_tool_handler(tool_name) { return this.env.actions.actions[tool_name].handler; } // Smart Actions architecture (may be overwritten to use custom logic)
  get_tool_call(json) {
    if(typeof this.adapter?.get_tool_call === 'function') return this.adapter.get_tool_call(json);
    return json.choices?.[0].message.tool_calls?.[0]; // OpenAI format
  } 
  get_tool_name(tool_call) {
    if(typeof this.adapter?.get_tool_name === 'function') return this.adapter.get_tool_name(tool_call);
    return tool_call.function.name;
  }
  get_tool_call_content(tool_call) {
    if(typeof this.adapter?.get_tool_call_content === 'function') return this.adapter.get_tool_call_content(tool_call);
    return JSON.parse(tool_call.function.arguments);
  }
  // HANDLE MESSAGES
  get_message(json) {
    if(typeof this.adapter?.get_message === 'function') return this.adapter.get_message(json);
    return json.choices?.[0].message || json.message; // supports OpenAI and Ollama
  }
  get_message_content(json) {
    if(typeof this.adapter?.get_message_content === 'function') return this.adapter.get_message_content(json);
    return this.get_message(json).content;
  }

  async request(req){
    req.url = this.endpoint;
    req.throw = false;
    const resp = await this.request_adapter(req);
    console.log(resp);
    const resp_json = await this.get_resp_json(resp);
    console.log(resp_json);
    return resp_json;
  }
  async get_resp_json(resp) { return (typeof resp.json === 'function') ? await resp.json() : await resp.json; }
  get request_adapter(){ return this._request_adapter || fetch; } // handle fallback to fetch (allows for overwriting in child classes)

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
    this.main.done_handler(full_str);
  }
  chunk_handler(text_chunk) {
    // Should handle:
    // 1. Update chat UI
    this.main.chunk_handler(text_chunk);
  }
  async count_tokens(input) {
    if(typeof this.adapter?.count_tokens === 'function') return await this.adapter.count_tokens(input);
    if(!this.tokenizer) this.tokenizer = getEncoding("cl100k_base");
    if(typeof input === 'object') input = JSON.stringify(input);
    return this.tokenizer.encode(input).length;
  }
  estimate_tokens(input) {
    if(typeof this.adapter?.estimate_tokens === 'function') return this.adapter.estimate_tokens(input);
    if(typeof input === 'object') input = JSON.stringify(input);
    return input.length / 4;
  }
  async test_api_key() {
    try{
      const resp = await this.complete({
        messages: [
          { role: "user", content: "Hello" },
        ],
        temperature: 0,
        max_tokens: 100,
        stream: false,
        n: 1,
      }, false);
      console.log(resp);
      if(!resp) return false;
      return true;
    }catch(err){
      return false;
    }
  }
  // getters
  get api_key() { return this.config.api_key; }
  get current() { return this.env.chats.current; }
  // use endpoint of combine protocol, hostname, port, and path
  get endpoint() {
    if(typeof this.adapter?.endpoint !== 'undefined') return this.adapter.endpoint;
    return this.config.endpoint || this.config.protocol + "://" + this.config.hostname + ":" + this.config.port + this.config.path;
  }
  get endpoint_streaming() {
    if(typeof this.adapter?.endpoint_streaming !== 'undefined') return this.adapter.endpoint_streaming;
    return this.config.endpoint_streaming || this.endpoint;
  }
  get max_input_tokens() { return this.config.max_input_tokens; }
  get max_output_tokens() { return this.config.max_output_tokens; }
  get model_name() { return this.config.model_name; }
}
exports.SmartChatModel = SmartChatModel;