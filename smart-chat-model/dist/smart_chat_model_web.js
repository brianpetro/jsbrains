var smart_chat_model = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };

  // adapters/anthropic.js
  var require_anthropic = __commonJS({
    "adapters/anthropic.js"(exports) {
      var AnthropicAdapter = class {
        prepare_request_body(opts) {
          return chatml_to_anthropic(opts);
        }
        async count_tokens(input) {
          return this.estimate_tokens(input);
        }
        estimate_tokens(input) {
          if (typeof input === "object")
            input = JSON.stringify(input);
          return Math.ceil(input.length / 6);
        }
        get_tool_call(json) {
          return json.content.find((msg) => msg.type === "tool_use");
        }
        get_tool_call_content(tool_call) {
          return tool_call.input;
        }
        get_tool_name(tool_call) {
          return tool_call.name;
        }
        get_message(json) {
          return json.content?.[0];
        }
        get_message_content(json) {
          return this.get_message(json)?.[this.get_message(json)?.type];
        }
      };
      exports.AnthropicAdapter = AnthropicAdapter;
      function chatml_to_anthropic(opts) {
        const messages = opts.messages.filter((msg) => msg.role !== "system");
        const { model, max_tokens, temperature, tools } = opts;
        const last_system_idx = opts.messages.findLastIndex((msg) => msg.role === "system" && msg.content.includes("---BEGIN"));
        if (last_system_idx > -1) {
          const system_prompt = "<context>\n" + opts.messages[last_system_idx].content + "\n</context>\n";
          messages[messages.length - 1].content = system_prompt + messages[messages.length - 1].content;
        }
        console.log(messages);
        const out = {
          messages,
          model,
          max_tokens,
          temperature
        };
        if (tools) {
          out.tools = tools.map((tool) => ({
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters
          }));
          const tool_prompt = `Use the "${out.tools[0].name}" tool!`;
          const last_user_idx = out.messages.findLastIndex((msg) => msg.role === "user");
          out.messages[last_user_idx].content += "\n" + tool_prompt;
        }
        const last_non_context_system_idx = opts.messages.findLastIndex((msg) => msg.role === "system" && !msg.content.includes("---BEGIN"));
        if (last_non_context_system_idx > -1)
          out.system = opts.messages[last_non_context_system_idx].content;
        return out;
      }
      exports.chatml_to_anthropic = chatml_to_anthropic;
    }
  });

  // adapters/cohere.js
  var require_cohere = __commonJS({
    "adapters/cohere.js"(exports) {
      var CohereAdapter = class {
        prepare_request_body(chatml) {
          return chatml_to_cohere(chatml);
        }
        get_message_content(json) {
          return json.text;
        }
        // note: OFF because streamer sends all chunks in one go
        get_text_chunk_from_stream(event) {
          if (!this.last_line_index)
            this.last_line_index = 0;
          clearTimeout(this.last_line_timeout);
          this.last_line_timeout = setTimeout(() => {
            this.last_line_index = 0;
          }, 1e4);
          const data = event.source.xhr.responseText;
          const lines = data.split("\n").slice(this.last_line_index);
          console.log(lines);
          this.last_line_index += lines.length;
          const text_chunk = lines.filter((line) => line.trim() !== "").map((line) => {
            console.log(line);
            const json = JSON.parse(line);
            if (json.event_type === "stream-end") {
              console.log("stream-end");
              this.end_of_stream = true;
              setTimeout(() => {
                this.end_of_stream = false;
              }, 3e3);
              return "";
            }
            return json.text;
          }).join("");
          console.log(text_chunk);
          return text_chunk;
        }
        is_end_of_stream(event) {
          return this.end_of_stream;
        }
      };
      exports.CohereAdapter = CohereAdapter;
      function chatml_to_cohere(chatml) {
        const cohere = {
          model: chatml.model,
          // skip last user message
          chat_history: chatml.messages.slice(0, -1).map((message) => ({
            role: message.role,
            message: message.content
          })),
          message: chatml.messages[chatml.messages.length - 1].content,
          temperature: chatml.temperature
          // stream: chatml.stream // currently not supported
        };
        return cohere;
      }
      exports.chatml_to_cohere = chatml_to_cohere;
    }
  });

  // adapters/gemini.js
  var require_gemini = __commonJS({
    "adapters/gemini.js"(exports) {
      var GeminiAdapter = class {
        constructor(model) {
          this.model = model;
        }
        prepare_request_body(body) {
          return chatml_to_gemini(body);
        }
        get_tool_call(json) {
          return json.candidates?.[0]?.content?.parts?.[0]?.functionCall;
        }
        get_tool_name(tool_call) {
          return tool_call?.name;
        }
        get_tool_call_content(tool_call) {
          return tool_call?.args;
        }
        get_message(json) {
          return json.candidates?.[0];
        }
        get_message_content(json) {
          return this.get_message(json)?.content?.parts.map((part) => part.text).join("");
        }
        // handle escaped newlines
        get_text_chunk_from_stream(event) {
          return event.data.replace(/\\n/g, "\n");
        }
        // if readyState is 4, then the stream is done
        is_end_of_stream(event) {
          return event.source.xhr.readyState === 4;
        }
        async count_tokens(input) {
          const req = {
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:countTokens?key=${this.model.api_key}`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
          };
          let body;
          if (typeof input === "string")
            body = chatml_to_gemini({ messages: [{ role: "user", content: input }] });
          else if (Array.isArray(input))
            body = chatml_to_gemini({ messages: input });
          else if (typeof input === "object")
            body = chatml_to_gemini(input);
          else
            return console.error("Invalid input for count_tokens", input);
          delete body.generationConfig;
          delete body.safetySettings;
          req.body = JSON.stringify(body);
          const resp = await this.model.request_adapter(req);
          return resp?.json?.totalTokens;
        }
        get endpoint() {
          return this.model.config.endpoint + "?key=" + this.model.api_key;
        }
        get endpoint_streaming() {
          return this.model.config.endpoint_streaming + "?key=" + this.model.api_key;
        }
      };
      exports.GeminiAdapter = GeminiAdapter;
      function chatml_to_gemini(opts) {
        const messages = opts.messages.filter((msg) => msg.role !== "system");
        const last_system_idx = opts.messages.findLastIndex((msg) => msg.role === "system" && msg.content.includes("---BEGIN"));
        if (last_system_idx > -1) {
          const system_prompt = "---BEGIN IMPORTANT CONTEXT---\n" + opts.messages[last_system_idx].content + "\n---END IMPORTANT CONTEXT---\n\n";
          messages[messages.length - 1].content = system_prompt + messages[messages.length - 1].content;
        }
        const body = {
          contents: messages.filter((msg) => msg.role !== "system").map((msg) => ({
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            temperature: opts.temperature || 0.9,
            topK: opts.topK || 1,
            topP: opts.topP || 1,
            maxOutputTokens: opts.max_tokens || 2048,
            stopSequences: opts.stopSequences || [],
            candidate_count: opts.n || 1
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        };
        if (opts.tools) {
          body.tools = [{
            function_declarations: opts.tools.map((tool) => ({
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters
            }))
          }];
          body.tool_config = {
            function_calling_config: {
              mode: "ANY"
            }
          };
          const tool_prompt = `Use the "${body.tools[0].function_declarations[0].name}" tool!`;
          const last_user_idx = body.contents.findLastIndex((msg) => msg.role === "user");
          body.contents[last_user_idx].parts[0].text += "\n" + tool_prompt;
        }
        return body;
      }
      exports.chatml_to_gemini = chatml_to_gemini;
    }
  });

  // adapters.js
  var require_adapters = __commonJS({
    "adapters.js"(exports) {
      var { AnthropicAdapter } = require_anthropic();
      var { CohereAdapter } = require_cohere();
      var { GeminiAdapter } = require_gemini();
      exports.Anthropic = AnthropicAdapter;
      exports.Cohere = CohereAdapter;
      exports.Gemini = GeminiAdapter;
    }
  });

  // models.json
  var require_models = __commonJS({
    "models.json"(exports, module) {
      module.exports = {
        "openai-gpt-3.5-turbo": {
          model_name: "gpt-3.5-turbo",
          description: "OpenAI's GPT-3.5 model",
          max_input_tokens: 12288,
          max_output_tokens: 4096,
          type: "API",
          endpoint: "https://api.openai.com/v1/chat/completions",
          streaming: true,
          actions: true
        },
        "openai-gpt-4-turbo": {
          model_name: "gpt-4-turbo-preview",
          description: "OpenAI's GPT-4 model",
          max_input_tokens: 123900,
          type: "API",
          endpoint: "https://api.openai.com/v1/chat/completions",
          streaming: true,
          actions: true
        },
        "google-gemini-1.0-pro": {
          model_name: "gemini-1.0-pro",
          description: "Google's Gemini 1.0 Pro model",
          max_input_tokens: 3e4,
          api_key_header: "none",
          type: "API",
          endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent",
          endpoint_streaming: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:streamGenerateContent",
          streaming: true,
          adapter: "Gemini",
          actions: true
        },
        "anthropic-claude-3-opus": {
          model_name: "claude-3-opus-20240229",
          description: "Anthropic's Claude model",
          max_input_tokens: 2e5,
          max_output_tokens: 4e3,
          type: "API",
          endpoint: "https://api.anthropic.com/v1/messages",
          streaming: false,
          api_key_header: "x-api-key",
          headers: {
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "tools-2024-04-04"
          },
          adapter: "Anthropic",
          actions: true
        },
        "anthropic-claude-3-sonnet": {
          model_name: "claude-3-sonnet-20240229",
          description: "Anthropic's Sonnet model",
          max_input_tokens: 2e5,
          max_output_tokens: 4e3,
          type: "API",
          endpoint: "https://api.anthropic.com/v1/messages",
          streaming: false,
          api_key_header: "x-api-key",
          headers: {
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "tools-2024-04-04"
          },
          adapter: "Anthropic",
          actions: true
        },
        "anthropic-claude-3-haiku": {
          model_name: "claude-3-haiku-20240307",
          description: "Anthropic's Haiku model",
          max_input_tokens: 2e5,
          max_output_tokens: 4e3,
          type: "API",
          endpoint: "https://api.anthropic.com/v1/messages",
          streaming: false,
          api_key_header: "x-api-key",
          headers: {
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "tools-2024-04-04"
          },
          adapter: "Anthropic",
          actions: true
        },
        "google-gemini-1.5-pro-latest": {
          model_name: "gemini-1.5-pro-latest",
          description: "Google's Gemini 1.5 Pro model",
          max_input_tokens: 1e6,
          api_key_header: "none",
          type: "API",
          endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",
          endpoint_streaming: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:streamGenerateContent",
          streaming: true,
          adapter: "Gemini",
          actions: true
        },
        "cohere-command-r": {
          model_name: "command-r",
          description: "Cohere's Command-R model",
          max_input_tokens: 128e3,
          max_output_tokens: 4e3,
          type: "API",
          endpoint: "https://api.cohere.ai/v1/chat",
          streaming: false,
          adapter: "Cohere"
        },
        "cohere-command-r-plus": {
          model_name: "command-r-plus",
          description: "Cohere's Command-R+ model",
          max_input_tokens: 128e3,
          max_output_tokens: 4e3,
          type: "API",
          endpoint: "https://api.cohere.ai/v1/chat",
          streaming: false,
          adapter: "Cohere"
        },
        "custom_local": {
          model_name: "custom_local",
          description: "Custom model served locally using OpenAI API format",
          type: "API"
        },
        "custom_api": {
          model_name: "custom-server",
          description: "Custom model served via external API using OpenAI API format",
          type: "API"
        }
      };
    }
  });

  // utils/is_valid_tool_call.js
  var require_is_valid_tool_call = __commonJS({
    "utils/is_valid_tool_call.js"(exports) {
      function is_valid_tool_call(tool, tool_call_content) {
        const props = tool.function.parameters.properties;
        Object.entries(tool_call_content).forEach(([key, value]) => {
          if (!props[key])
            throw new Error(`Invalid tool call: missing key ${key} in tool spec`, props);
          if (Array.isArray(value) && props[key].type === "array") {
            const itemType = typeof value[0];
            if (!value.every((item) => typeof item === itemType))
              throw new Error(`Invalid tool call: array items are not of the same type`);
            if (props[key].items.type !== itemType)
              throw new Error(`Invalid tool call: array items are not of the same type as the spec`);
          } else if (props[key].type !== typeof value) {
            if (props[key].type === "number" && typeof value === "string") {
              if (isNaN(Number(value)))
                throw new Error(`Invalid tool call: value ${value} is not a valid number`);
              tool_call_content[key] = Number(value);
            } else
              throw new Error(`Invalid tool call: value ${value} is not of type ${props[key].type}`);
          }
          if (props[key].enum && !props[key].enum.includes(value))
            throw new Error(`Invalid tool call: value ${value} is not in enum ${props[key].enum}`);
        });
        tool.function.parameters.required?.forEach((key) => {
          if (!tool_call_content[key])
            throw new Error(`Invalid tool call: missing required key ${key}`);
        });
        return true;
      }
      exports.is_valid_tool_call = is_valid_tool_call;
    }
  });

  // streamer.js
  var require_streamer = __commonJS({
    "streamer.js"(exports) {
      var _setReadyState, setReadyState_fn, _onStreamFailure, onStreamFailure_fn, _onStreamAbort, onStreamAbort_fn, _onStreamProgress, onStreamProgress_fn, _onStreamLoaded, onStreamLoaded_fn, _parseEventChunk, parseEventChunk_fn, _checkStreamClosed, checkStreamClosed_fn;
      var SmartStreamer = class {
        constructor(url, options = {}) {
          // private methods
          __privateAdd(this, _setReadyState);
          __privateAdd(this, _onStreamFailure);
          __privateAdd(this, _onStreamAbort);
          __privateAdd(this, _onStreamProgress);
          __privateAdd(this, _onStreamLoaded);
          __privateAdd(this, _parseEventChunk);
          __privateAdd(this, _checkStreamClosed);
          const {
            method = "GET",
            headers = {},
            body = null,
            withCredentials = false
          } = options;
          this.url = url;
          this.method = method;
          this.headers = headers;
          this.body = body;
          this.withCredentials = withCredentials;
          this.listeners = {};
          this.readyState = this.CONNECTING;
          this.progress = 0;
          this.chunk = "";
          this.last_event_id = "";
          this.xhr = null;
          this.FIELD_SEPARATOR = ":";
          this.INITIALIZING = -1;
          this.CONNECTING = 0;
          this.OPEN = 1;
          this.CLOSED = 2;
        }
        /**
         * Adds an event listener for the specified event type.
         *
         * @param {string} type - The type of the event.
         * @param {Function} listener - The listener function to be called when the event is triggered.
         */
        addEventListener(type, listener) {
          if (!this.listeners[type])
            this.listeners[type] = [];
          if (!this.listeners[type].includes(listener))
            this.listeners[type].push(listener);
        }
        /**
         * Removes an event listener from the SmartStreamer instance.
         *
         * @param {string} type - The type of event to remove the listener from.
         * @param {Function} listener - The listener function to remove.
         */
        removeEventListener(type, listener) {
          if (!this.listeners[type])
            return;
          this.listeners[type] = this.listeners[type].filter((callback) => callback !== listener);
          if (this.listeners[type].length === 0)
            delete this.listeners[type];
        }
        /**
         * Dispatches an event to the appropriate event handlers.
         *
         * @param {Event} event - The event to be dispatched.
         * @returns {boolean} - Returns true if the event was successfully dispatched, false otherwise.
         */
        dispatchEvent(event) {
          if (!event)
            return true;
          event.source = this;
          const onHandler = "on" + event.type;
          if (Object.prototype.hasOwnProperty.call(this, onHandler)) {
            this[onHandler].call(this, event);
            if (event.defaultPrevented)
              return false;
          }
          if (this.listeners[event.type]) {
            this.listeners[event.type].forEach((callback) => {
              callback(event);
              return !event.defaultPrevented;
            });
          }
          return true;
        }
        /**
         * Initiates the streaming process.
         */
        stream() {
          __privateMethod(this, _setReadyState, setReadyState_fn).call(this, this.CONNECTING);
          this.xhr = new XMLHttpRequest();
          this.xhr.addEventListener("progress", __privateMethod(this, _onStreamProgress, onStreamProgress_fn).bind(this));
          this.xhr.addEventListener("load", __privateMethod(this, _onStreamLoaded, onStreamLoaded_fn).bind(this));
          this.xhr.addEventListener("readystatechange", __privateMethod(this, _checkStreamClosed, checkStreamClosed_fn).bind(this));
          this.xhr.addEventListener("error", __privateMethod(this, _onStreamFailure, onStreamFailure_fn).bind(this));
          this.xhr.addEventListener("abort", __privateMethod(this, _onStreamAbort, onStreamAbort_fn).bind(this));
          this.xhr.open(this.method, this.url);
          for (const header in this.headers) {
            this.xhr.setRequestHeader(header, this.headers[header]);
          }
          if (this.last_event_id)
            this.xhr.setRequestHeader("Last-Event-ID", this.last_event_id);
          this.xhr.withCredentials = this.withCredentials;
          this.xhr.send(this.body);
        }
        /**
         * Ends the streamer connection.
         * Aborts the current XHR request and sets the ready state to CLOSED.
         */
        end() {
          if (this.readyState === this.CLOSED)
            return;
          this.xhr.abort();
          this.xhr = null;
          __privateMethod(this, _setReadyState, setReadyState_fn).call(this, this.CLOSED);
        }
      };
      _setReadyState = new WeakSet();
      setReadyState_fn = function(state) {
        const event = new CustomEvent("readyStateChange");
        event.readyState = state;
        this.readyState = state;
        this.dispatchEvent(event);
      };
      _onStreamFailure = new WeakSet();
      onStreamFailure_fn = function(e) {
        const event = new CustomEvent("error");
        event.data = e.currentTarget.response;
        this.dispatchEvent(event);
        this.end();
      };
      _onStreamAbort = new WeakSet();
      onStreamAbort_fn = function(e) {
        const event = new CustomEvent("abort");
        this.end();
      };
      _onStreamProgress = new WeakSet();
      onStreamProgress_fn = function(e) {
        if (!this.xhr)
          return;
        if (this.xhr.status !== 200) {
          __privateMethod(this, _onStreamFailure, onStreamFailure_fn).call(this, e);
          return;
        }
        if (this.readyState === this.CONNECTING) {
          this.dispatchEvent(new CustomEvent("open"));
          __privateMethod(this, _setReadyState, setReadyState_fn).call(this, this.OPEN);
        }
        const data = this.xhr.responseText.substring(this.progress);
        this.progress += data.length;
        data.split(/(\r\n|\r|\n)/g).forEach((part) => {
          if (part.trim().length === 0) {
            this.dispatchEvent(__privateMethod(this, _parseEventChunk, parseEventChunk_fn).call(this, this.chunk.trim()));
            this.chunk = "";
          } else {
            this.chunk += part;
          }
        });
      };
      _onStreamLoaded = new WeakSet();
      onStreamLoaded_fn = function(e) {
        __privateMethod(this, _onStreamProgress, onStreamProgress_fn).call(this, e);
        this.dispatchEvent(__privateMethod(this, _parseEventChunk, parseEventChunk_fn).call(this, this.chunk));
        this.chunk = "";
      };
      _parseEventChunk = new WeakSet();
      parseEventChunk_fn = function(chunk) {
        if (!chunk || chunk.length === 0)
          return null;
        const e = { id: null, retry: null, data: "", event: "message", text: "" };
        chunk.split(/(\r\n|\r|\n)/).forEach((line) => {
          line = line.trim();
          const index = line.indexOf(this.FIELD_SEPARATOR);
          if (index <= 0)
            return;
          const field = line.substring(0, index).replace(/^"|"$/g, "");
          if (!["id", "retry", "data", "event", "text"].includes(field))
            return;
          const value = line.substring(index + 1).trim().replace(/^"|"$/g, "");
          e.data += value;
        });
        if (e.id)
          this.last_event_id = e.id;
        const event = new CustomEvent(e.event || "message");
        event.id = e.id;
        event.data = e.data || "";
        event.last_event_id = this.last_event_id;
        return event;
      };
      _checkStreamClosed = new WeakSet();
      checkStreamClosed_fn = function() {
        if (!this.xhr)
          return;
        if (this.xhr.readyState === XMLHttpRequest.DONE)
          __privateMethod(this, _setReadyState, setReadyState_fn).call(this, this.CLOSED);
      };
      exports.SmartStreamer = SmartStreamer;
    }
  });

  // smart_chat_model.js
  var require_smart_chat_model = __commonJS({
    "smart_chat_model.js"(exports) {
      var adapters = require_adapters();
      var chat_models = require_models();
      var { is_valid_tool_call } = require_is_valid_tool_call();
      var { SmartStreamer } = require_streamer();
      var SmartChatModel = class {
        constructor(main, model_key, opts = {}) {
          this.env = main;
          this.main = this.env;
          this.config = {
            ...chat_models[model_key],
            // from chat_models.json
            ...opts
            // user opts (overwrites model_config)
          };
          this.active_stream = null;
          this._request_adapter = null;
          this.models = chat_models;
          if (this.config.adapter)
            this.adapter = new adapters[this.config.adapter](this);
          console.log(this.adapter);
        }
        static get models() {
          return chat_models;
        }
        get default_opts() {
          return {
            temperature: 0.3,
            top_p: 1,
            presence_penalty: 0,
            frequency_penalty: 0,
            n: 1,
            model: this.model_name,
            max_tokens: this.max_output_tokens
          };
        }
        async request_middlewares(opts) {
          return opts;
        }
        async complete(opts = {}, render = true) {
          opts = {
            ...this.default_opts,
            messages: (await this.current.get_chat_ml())?.messages || [],
            ...opts
          };
          if (opts.stream !== false && this.config.streaming && !this.current.tool_choice)
            opts.stream = true;
          else
            opts.stream = false;
          opts = await this.request_middlewares(JSON.parse(JSON.stringify(opts)));
          const req = {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.api_key}`
            },
            method: "POST"
          };
          if (this.config.headers)
            req.headers = { ...req.headers, ...this.config.headers };
          if (this.config.api_key_header) {
            if (this.config.api_key_header !== "none")
              req.headers[this.config.api_key_header] = this.api_key;
            delete req.headers.Authorization;
          }
          const body = typeof this.env.actions?.prepare_request_body === "function" ? this.env.actions.prepare_request_body(opts) : { ...opts };
          req.body = JSON.stringify(typeof this.adapter?.prepare_request_body === "function" ? this.adapter.prepare_request_body(body) : body);
          console.log(req);
          try {
            if (opts.stream)
              return await this.stream(req);
            const resp_json = await this.request(req);
            if (resp_json.error) {
              console.error(resp_json.error);
              if (render)
                this.done_handler("*API Error. See console logs for details.*");
              return;
            }
            const tool_call = this.get_tool_call(resp_json);
            if (tool_call) {
              this.env.chats.current.tool_choice = null;
              const tool_name = this.get_tool_name(tool_call);
              const tool_call_content = this.get_tool_call_content(tool_call);
              const tool = body.tools.find((t) => t.function.name === tool_name);
              if (is_valid_tool_call(tool, tool_call_content)) {
                await this.current.add_message({ role: "assistant", tool_calls: [tool_call] });
                const tool_handler = this.get_tool_handler(tool_name);
                if (!tool_handler)
                  return console.error(`Tool ${tool_name} not found`);
                const tool_output = await tool_handler(tool_call_content);
                if (tool_output) {
                  await this.current.add_tool_output(tool_name, tool_output);
                  return this.complete({});
                }
              } else {
                console.error(`Invalid tool call: ${tool_call}`);
                if (render)
                  this.done_handler("*Invalid tool call. See console logs for details.*");
                return "*Invalid tool call. See console logs for details.*";
              }
            }
            if (render)
              this.done_handler(this.get_message_content(resp_json));
            return this.get_message_content(resp_json);
          } catch (err) {
            console.error(err);
          }
        }
        // HANDLE TOOLS
        get_tool_handler(tool_name) {
          return this.env.actions.actions[tool_name].handler;
        }
        // Smart Actions architecture (may be overwritten to use custom logic)
        get_tool_call(json) {
          if (typeof this.adapter?.get_tool_call === "function")
            return this.adapter.get_tool_call(json);
          return json.choices?.[0].message.tool_calls?.[0];
        }
        get_tool_name(tool_call) {
          if (typeof this.adapter?.get_tool_name === "function")
            return this.adapter.get_tool_name(tool_call);
          return tool_call.function.name;
        }
        get_tool_call_content(tool_call) {
          if (typeof this.adapter?.get_tool_call_content === "function")
            return this.adapter.get_tool_call_content(tool_call);
          return JSON.parse(tool_call.function.arguments);
        }
        // HANDLE MESSAGES
        get_message(json) {
          if (typeof this.adapter?.get_message === "function")
            return this.adapter.get_message(json);
          return json.choices?.[0].message || json.message;
        }
        get_message_content(json) {
          if (typeof this.adapter?.get_message_content === "function")
            return this.adapter.get_message_content(json);
          return this.get_message(json).content;
        }
        async request(req) {
          req.url = this.endpoint;
          req.throw = false;
          const resp = this._request_adapter ? await this._request_adapter(req) : await fetch(this.endpoint, req);
          console.log(resp);
          const resp_json = await this.get_resp_json(resp);
          console.log(resp_json);
          return resp_json;
        }
        async get_resp_json(resp) {
          return typeof resp.json === "function" ? await resp.json() : await resp.json;
        }
        get request_adapter() {
          return this._request_adapter;
        }
        // handle fallback to fetch (allows for overwriting in child classes)
        async stream(req) {
          console.log("Streaming Request: ");
          console.log(req);
          const full_text = await new Promise((resolve, reject) => {
            try {
              this.active_stream = new SmartStreamer(this.endpoint_streaming, req);
              let curr_text = "";
              this.active_stream.addEventListener("message", (e) => {
                if (this.is_end_of_stream(e)) {
                  this.stop_stream();
                  return resolve(curr_text);
                }
                let text_chunk = this.get_text_chunk_from_stream(e);
                if (!text_chunk)
                  return;
                curr_text += text_chunk;
                this.chunk_handler(text_chunk);
              });
              this.active_stream.addEventListener("readystatechange", (e) => {
                if (e.readyState >= 2)
                  console.log("ReadyState: " + e.readyState);
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
          this.done_handler(full_text);
          return full_text;
        }
        get_text_chunk_from_stream(event) {
          if (typeof this.adapter?.get_text_chunk_from_stream === "function")
            return this.adapter.get_text_chunk_from_stream(event);
          let resp = null;
          let text_chunk = "";
          try {
            resp = JSON.parse(event.data);
            text_chunk = resp.choices[0].delta.content;
          } catch (err) {
            console.log(err);
            console.log(event.data);
            if (event.data.indexOf("}{") > -1)
              event.data = event.data.replace(/}{/g, "},{");
            resp = JSON.parse(`[${event.data}]`);
            resp.forEach((r) => {
              if (r.choices)
                text_chunk += r.choices[0].delta.content;
            });
          }
          return text_chunk;
        }
        is_end_of_stream(event) {
          if (typeof this.adapter?.is_end_of_stream === "function")
            return this.adapter.is_end_of_stream(event);
          return event.data === "[DONE]";
        }
        stop_stream() {
          if (this.active_stream) {
            this.active_stream.end();
            this.active_stream = null;
          }
        }
        done_handler(full_str) {
          if (typeof this.main.done_handler === "function")
            this.main.done_handler(full_str);
        }
        chunk_handler(text_chunk) {
          if (typeof this.main.chunk_handler === "function")
            this.main.chunk_handler(text_chunk);
        }
        async count_tokens(input) {
          if (typeof this.adapter?.count_tokens === "function")
            return await this.adapter.count_tokens(input);
          if (!this.tokenizer)
            this.tokenizer = getEncoding("cl100k_base");
          if (typeof input === "object")
            input = JSON.stringify(input);
          return this.tokenizer.encode(input).length;
        }
        estimate_tokens(input) {
          if (typeof this.adapter?.estimate_tokens === "function")
            return this.adapter.estimate_tokens(input);
          if (typeof input === "object")
            input = JSON.stringify(input);
          return input.length / 4;
        }
        async test_api_key() {
          try {
            const resp = await this.complete({
              messages: [
                { role: "user", content: "Hello" }
              ],
              temperature: 0,
              max_tokens: 100,
              stream: false,
              n: 1
            }, false);
            console.log(resp);
            if (!resp)
              return false;
            return true;
          } catch (err) {
            return false;
          }
        }
        // getters
        get api_key() {
          return this.config.api_key;
        }
        get current() {
          return this.env.chats.current;
        }
        // use endpoint of combine protocol, hostname, port, and path
        get endpoint() {
          if (typeof this.adapter?.endpoint !== "undefined")
            return this.adapter.endpoint;
          return this.config.endpoint || this.config.protocol + "://" + this.config.hostname + ":" + this.config.port + this.config.path;
        }
        get endpoint_streaming() {
          if (typeof this.adapter?.endpoint_streaming !== "undefined")
            return this.adapter.endpoint_streaming;
          return this.config.endpoint_streaming || this.endpoint;
        }
        get max_input_tokens() {
          return this.config.max_input_tokens;
        }
        get max_output_tokens() {
          return this.config.max_output_tokens;
        }
        get model_name() {
          return this.config.model_name;
        }
      };
      exports.SmartChatModel = SmartChatModel;
    }
  });
  return require_smart_chat_model();
})();
