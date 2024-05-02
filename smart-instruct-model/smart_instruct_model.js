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

const { SmartStreamer } = require('./streamer');
// const { getEncoding } = require("js-tiktoken");
// const { SmartChatModel } = require('../smart-chat-model');

class SmartInstructModel {
  constructor(opts={}) {
    // this.main = main;
    this.config = {
      ...opts,
    }
    this.active_stream = null;
    this._request_adapter = opts.request_adapter || null;
    // this.tokenizer = getEncoding("cl100k_base");
  }
  async complete(opts={}, done_handler=null) {
    const req = await this.prepare_request(opts);
    req.url = "https://api.openai.com/v1/completions";
    req.throw = false;
    console.log(req);
    try {
      const resp = await this.request(req);
      console.log(resp);
      const json = await this.get_resp(resp);
      console.log(json);
      if(json.error) {
        console.error(json.error);
        return done_handler("*API Error. See console logs for details.*");
      }
      if(done_handler) done_handler(this.get_message_content(json));
      return this.get_message_content(json);
      // console.log(response);
    } catch (err) {
      console.error(err);
      // new Notice(`Smart Connections API Error :: ${err}`);
    }
  }
  get_message(json) { return json.choices[0].message; }
  get_message_content(json) { return this.get_message(json).content; }
  prepare_request_body(opts) {
    if(!opts.model) opts.model = this.model_name;
    if(this.max_output_tokens) opts.max_tokens = this.max_output_tokens;
    return opts;
  }
  async prepare_request(opts) {
    opts = JSON.parse(JSON.stringify(opts));
    // opts = await this.main.request_middlewares(opts);
    const req = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.api_key}`
      },
      method: "POST",
      body: JSON.stringify(this.prepare_request_body(opts))
    };
    if (this.config.headers) req.headers = { ...req.headers, ...this.config.headers };
    if (this.config.api_key_header) {
      if(this.config.api_key_header !== 'none') req.headers[this.config.api_key_header] = this.api_key;
      delete req.headers.Authorization;
    }
    return req;
  }

  async request(opts){ return await this.request_adapter(opts); }
  // handle fallback to fetch (allows for overwriting in child classes)
  async get_resp(resp) { return (typeof resp.json === 'function') ? await resp.json() : await resp.json; }
  get request_adapter(){ return this._request_adapter || fetch; }

  async stream(opts, done_handler=this.done_handler.bind(this), chunk_handler=this.chunk_handler.bind(this)) {
    if(!opts.stream) opts.stream = true;
    const req = await this.prepare_request(opts);
    const full_str = await new Promise((resolve, reject) => {
      try {
        // console.log("stream", opts);
        this.active_stream = new SmartStreamer("https://api.openai.com/v1/completions", req);
        let curr_text = "";
        this.active_stream.addEventListener("message", (e) => {
          // console.log(e);
          if(e.data === "[DONE]") {
            // this.end_stream();
            this.stop_stream();
            return resolve(curr_text);
          }
          let resp = null;
          let text_chunk = '';
          // DO: is this try/catch still necessary?
          try {
            resp = JSON.parse(e.data);
            // text_chunk = resp.choices[0].delta.content;
            text_chunk = resp.choices[0].text;
          } catch (err) {
            console.log(err);
            console.log(e.data);
            if (e.data.indexOf('}{') > -1) e.data = e.data.replace(/}{/g, '},{');
            resp = JSON.parse(`[${e.data}]`);
            resp.forEach((r) => {
              // if (r.choices) text_chunk += r.choices[0].delta.content;
              if (r.choices) text_chunk += r.choices[0].text;
            });
          }
          if(!text_chunk) return;
          curr_text += text_chunk;
          if(chunk_handler) chunk_handler(text_chunk); // call the chunk handler if it exists
          else done_handler(curr_text); // else call the done handler (less efficient)
        });
        // unnecessary?
        this.active_stream.addEventListener("readystatechange", (e) => {
          if (e.readyState >= 2) console.log("ReadyState: " + e.readyState);
        });
        this.active_stream.addEventListener("error", (e) => {
          console.error(e);
          // new Notice("Smart Connections Error Streaming Response. See console for details.");
          done_handler("*API Error. See console logs for details.*");
          // this.end_stream();
          this.stop_stream();
          reject(e);
        });
        this.active_stream.stream();
      } catch (err) {
        console.error(err);
        // new Notice("Smart Connections Error Streaming Response. See console for details.");
        // this.end_stream();
        this.stop_stream();
        reject(err);
      }
    });
    // console.log(full_str);
    done_handler(full_str);
  }

  done_handler(full_str) { console.log(full_str); }
  chunk_handler(text_chunk) { console.log(text_chunk); }
  async count_tokens(input) {
    if(typeof this.adapter?.count_tokens === 'function') return await this.adapter.count_tokens(input);
    return this.estimate_tokens(input);
  }
  estimate_tokens(input) {
    if(typeof this.adapter?.estimate_tokens === 'function') return this.adapter.estimate_tokens(input);
    if(typeof input === 'object') input = JSON.stringify(input);
    return input.length / 4;
  }
  // getters
  get model_name() { return "gpt-3.5-turbo-instruct"; }
}
exports.SmartInstructModel = SmartInstructModel;