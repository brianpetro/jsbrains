import { SmartHttpRequest } from "smart-http-request";
import { SmartStreamer } from '../streamer.js'; // move to smart-http-request???
import { SmartChatModelAdapter } from './_adapter.js';

/**
 * Base class for API adapters to handle various chat model platforms.
 * @extends SmartChatModelAdapter
 */
export class SmartChatModelApiAdapter extends SmartChatModelAdapter {
  constructor(main) {
    super(main);
  }

  /**
   * Get the request adapter class.
   * @returns {SmartChatModelRequestAdapter} The request adapter class.
   */
  get req_adapter() { return SmartChatModelRequestAdapter; }

  /**
   * Get the response adapter class.
   * @returns {SmartChatModelResponseAdapter} The response adapter class.
   */
  get res_adapter() { return SmartChatModelResponseAdapter; }

  get http_adapter() {
    if(!this._http_adapter){
      if(this.main.opts.http_adapter) this._http_adapter = this.main.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest();
    }
    return this._http_adapter;
  }

  /**
   * Count the number of tokens in a given request.
   * @param {Object} req - The request object.
   * @throws {Error} Throws an error if not implemented in the subclass.
   */
  async count_tokens(req) { throw new Error("count_tokens not implemented"); }

  /**
   * Get the available models from the platform.
   * @param {boolean} [refresh=false] - Whether to refresh the cached models.
   * @returns {Promise<Array<Object>>} An array of model objects.
   */
  async get_models(refresh=false) {
    if(!this.platform.models_endpoint){
      if(Array.isArray(this.platform.models)) return this.platform.models;
      else throw new Error("models_endpoint or models array is required in platforms.json");
    }
    if(!refresh && this.platform_settings?.models) return this.platform_settings.models; // return cached models if not refreshing
    if(!this.api_key) {
      console.warn('No API key provided to retrieve models');
      return [];
    }
    try {
      const response = await this.http_adapter.request({
        url: this.models_endpoint,
        method: this.models_endpoint_method,
        headers: {
          'Authorization': `Bearer ${this.api_key}`,
        },
      });
      const model_data = this.parse_model_data(await response.json());
      this.platform_settings.models = model_data;
      return model_data;
    } catch (error) {
      console.error('Failed to fetch model data:', error);
      return [];
    }
  }

  /**
   * Parses the raw model data from OpenAI API and transforms it into a more usable format.
   * @param {Object} model_data - The raw model data received from OpenAI API.
   * @returns {Array<Object>} An array of parsed model objects with the following properties:
   *   @property {string} model_name - The name/ID of the model as returned by the API.
   *   @property {string} key - The key used to identify the model (usually same as model_name).
   *   @property {boolean} multimodal - Indicates if the model supports multimodal inputs.
   *   @property {number} [max_input_tokens] - The maximum number of input tokens the model can process.
   *   @property {string} [description] - A description of the model's context and output capabilities.
   */
  parse_model_data(model_data) {
    throw new Error("parse_model_data not implemented"); // requires platform-specific implementation
  }

  /**
   * Completes a chat request.
   * @param {Object} req - The request object.
   * @returns {Promise<Object>} The completed chat response in OpenAI format.
   */
  async complete(req) {
    const _req = new this.req_adapter(this, {
      ...this.model_config,
      ...req,
    });
    const request_params = _req.to_platform();
    // console.log('request_params', request_params);
    const http_resp = await this.http_adapter.request(request_params);
    if(!http_resp) return null;
    // console.log('http_resp', http_resp);
    const _res = new this.res_adapter(this, await http_resp.json());
    try{
      return _res.to_openai();
    } catch (error) {
      console.error('Error in SmartChatModelApiAdapter.complete():', error);
      console.error(http_resp);
      return null;
    }
  }

  // STREAMING
  async stream(req, handlers={}) {
    const _req = new this.req_adapter(this, req);
    const request_params = _req.to_openai();
    const full_text = await new Promise((resolve, reject) => {
      try {
        this.active_stream = new SmartStreamer(this.endpoint_streaming, request_params);
        let curr_text = "";
        this.active_stream.addEventListener("message", (e) => {
          if(this.is_end_of_stream(e)) {
            this.stop_stream();
            return resolve(curr_text);
          }
          let text_chunk = this.get_text_chunk_from_stream(e);
          if(!text_chunk) return;
          curr_text += text_chunk;
          handlers.chunk(text_chunk); // call the chunk handler if it exists
        });
        // unnecessary?
        this.active_stream.addEventListener("readystatechange", (e) => {
          if (e.readyState >= 2) console.log("ReadyState: " + e.readyState);
        });
        this.active_stream.addEventListener("error", (e) => {
          console.error(e);
          handlers.error("*API Error. See console logs for details.*");
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
    handlers.done(full_text); // handled in complete()
    return full_text;
  }

  /**
   * Check if the event indicates the end of the stream.
   * @param {Event} event - The event object.
   * @returns {boolean} True if the event indicates the end of the stream, false otherwise.
   */
  is_end_of_stream(event) {
    if(typeof this.adapter?.is_end_of_stream === 'function') return this.adapter.is_end_of_stream(event);
    return event.data === "[DONE]"; // use default OpenAI format
  }

  /**
   * Stop the active stream.
   */
  stop_stream() {
    if (this.active_stream) {
      this.active_stream.end();
      this.active_stream = null;
    }
  }

  /**
   * Get the text chunk from the stream event.
   * @param {Event} event - The stream event.
   * @returns {string} The text chunk.
   */
  get_text_chunk_from_stream(event) {
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

  /**
   * Get the model configuration.
   * @returns {Object} The model configuration.
   */
  get model_config() {
    return {
      ...this.default_model_config,
      temperature: this.temperature || 0.3,
      n: this.choices || 1,
      model: this.model_key,
      max_tokens: this.max_output_tokens || 10000,
      // DO: Needs review
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
    };
  }

  /**
   * Get the API key.
   * @returns {string} The API key.
   */
  get api_key() {
    return this.main.opts.api_key // opts added at init take precedence
      || this.platform_settings?.api_key // then platform settings
    ;
  }

  /**

   * Get the number of choices.
   * @returns {number} The number of choices.
   */
  get choices() { return this.platform_settings.choices; }

  /**
   * Get the default model configuration.
   * @returns {Object} The default model configuration.
   */
  get default_model_config() { return this.models.find(m => m.key === this.model_key); }

  /**
   * Get the models.
   * @returns {Array} An array of model objects.
   */
  get models() { return this.platform_settings.models || this.platform.models || []; }

  get models_endpoint() { return this.platform.models_endpoint; }
  get models_endpoint_method() { return 'POST'; }

  /**
   * Get the endpoint URL.
   * @returns {string} The endpoint URL.
   */
  get endpoint() { return this.platform.endpoint; }

  /**
   * Get the streaming endpoint URL.
   * @returns {string} The streaming endpoint URL.
   */
  get endpoint_streaming() { return this.platform.endpoint_streaming || this.endpoint; }

  /**
   * Get the model key.
   * @returns {string} The model key.
   */
  get model_key() {
    return this.main.opts.model_key // opts added at init take precedence
      || this.platform_settings.model_key // then platform settings
    ;
  }

  /**
   * Get the maximum output tokens.
   * @returns {number} The maximum output tokens.
   */
  get max_output_tokens() { return this.platform_settings.max_output_tokens || this.default_model_config.max_output_tokens; }

  /**
   * Get the platform object.
   * @returns {Object} The platform object.
   */
  get platform() { return this.main.platform; }

  get platform_key() { return this.main.platform_key; }

  /**
   * Get the platform settings.
   * @returns {Object} The platform settings.
   */
  get platform_settings() {
    if(!this.settings[this.platform_key]) this.settings[this.platform_key] = {};
    return this.settings[this.platform_key];
  }

  get settings() { return this.main.settings; }

  /**
   * Get the temperature.
   * @returns {number} The temperature.
   */
  get temperature() { return this.platform_settings.temperature; }
}

/**
 * Base class for request adapters to handle various input schemas and convert them to OpenAI schema.
 */
export class SmartChatModelRequestAdapter {
  /**
   * @constructor
   * @param {SmartChatModelAdapter} adapter - The SmartChatModelAdapter instance.
   * @param {Object} req - The incoming request object.
   */
  constructor(adapter, req = {}) {
    this.adapter = adapter;
    this._req = req;
  }

  /**
   * @getter
   * @returns {Array} An array of message objects.
   */
  get messages() {
    return this._req.messages || [];
  }

  /**
   * @getter
   * @returns {string} The model identifier.
   */
  get model() {
    return this._req.model;
  }

  /**
   * @getter
   * @returns {number} The temperature setting for response generation.
   */
  get temperature() {
    return this._req.temperature;
  }

  /**
   * @getter
   * @returns {number} The maximum number of tokens to generate.
   */
  get max_tokens() {
    return this._req.max_tokens;
  }

  /**
   * @getter
   * @returns {boolean} Whether to stream the response.
   */
  get stream() {
    return this._req.stream;
  }

  /**
   * @getter
   * @returns {Array} An array of tool objects.
   */
  get tools() {
    return this._req.tools || null;
  }

  get tool_choice() {
    return this._req.tool_choice || null;
  }

  /**
   * Get the headers for the request.
   * @returns {Object} Headers object.
   */
  get_headers() {
    const headers = {
      "Content-Type": "application/json",
      ...(this.adapter.platform.headers || {}),
    };

    if(this.adapter.platform.api_key_header !== 'none') {
      if (this.adapter.platform.api_key_header){
        headers[this.adapter.platform.api_key_header] = this.adapter.api_key;
      }else if(this.adapter.api_key) {
        headers['Authorization'] = `Bearer ${this.adapter.api_key}`;
      }
    }

    return headers;
  }

  to_platform() { return this.to_openai(); }

  /**
   * Convert the request to OpenAI schema and include full request parameters.
   * @returns {Object} Request parameters object in OpenAI schema.
   */
  to_openai() {
    const body = {
      messages: this._transform_messages_to_openai(),
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.max_tokens,
      stream: this.stream,
      ...(this.tools && { tools: this._transform_tools_to_openai() }),
      ...(this._req.tool_choice && { tool_choice: this._req.tool_choice }),
    };

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      headers: this.get_headers(),
      body: JSON.stringify(body),
    };
  }

  /**
   * Transform messages to OpenAI format.
   * @returns {Array} Transformed messages array.
   * @private
   */
  _transform_messages_to_openai() {
    return this.messages.map(message => this._transform_single_message_to_openai(message));
  }

  /**
   * Transform a single message to OpenAI format.
   * @param {Object} message - The message object to transform.
   * @returns {Object} Transformed message object.
   * @private
   */
  _transform_single_message_to_openai(message) {
    const transformed = {
      role: this._get_openai_role(message.role),
      content: this._get_openai_content(message.content),
    };

    if (message.name) transformed.name = message.name;
    if (message.tool_calls) transformed.tool_calls = this._transform_tool_calls_to_openai(message.tool_calls);
    if (message.image_url) transformed.image_url = message.image_url;

    return transformed;
  }

  /**
   * Get the OpenAI role for a given role.
   * @param {string} role - The role to transform.
   * @returns {string} The transformed role.
   * @private
   */
  _get_openai_role(role) {
    // Override in subclasses if needed
    return role;
  }

  /**
   * Get the OpenAI content for a given content.
   * @param {string} content - The content to transform.
   * @returns {string} The transformed content.
   * @private
   */
  _get_openai_content(content) {
    // Override in subclasses if needed
    return content;
  }

  /**
   * Transform tool calls to OpenAI format.
   * @param {Array} tool_calls - Array of tool call objects.
   * @returns {Array} Transformed tool calls array.
   * @private
   */
  _transform_tool_calls_to_openai(tool_calls) {
    return tool_calls.map(tool_call => ({
      tool_name: tool_call.tool_name,
      parameters: tool_call.parameters
    }));
  }

  /**
   * Transform tools to OpenAI format.
   * @returns {Array} Transformed tools array.
   * @private
   */
  _transform_tools_to_openai() {
    return this.tools.map(tool => ({
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }
}

/**
 * Base class for response adapters to handle various output schemas and convert them to OpenAI schema.
 */
export class SmartChatModelResponseAdapter {
  /**
   * @constructor
   * @param {SmartChatModelAdapter} adapter - The SmartChatModelAdapter instance.
   * @param {Object} res - The response object.
   */
  constructor(adapter, res = {}) {
    this.adapter = adapter;
    this._res = res;
  }

  get id() {
    return this._res.id || null;
  }

  get object() {
    return this._res.object || null;
  }

  get created() {
    return this._res.created || null;
  }

  get choices() {
    return this._res.choices || [];
  }

  get tool_call() {
    return this.message.tool_calls?.[0] || null;
  }

  get tool_name() {
    return this.tool_call?.tool_name || null;
  }
  get tool_call_content() {
    return this.tool_call?.parameters || null;
  }

  get usage() {
    return this._res.usage || null;
  }

  /**
   * Convert the response to OpenAI schema.
   * @returns {Object} Response object in OpenAI schema.
   */
  to_openai() {
    return {
      id: this.id,
      object: this.object,
      created: this.created,
      choices: this._transform_choices_to_openai(),
      usage: this._transform_usage_to_openai(),
    };
  }

  /**
   * Transform choices to OpenAI format.
   * @returns {Array} Transformed choices array.
   * @private
   */
  _transform_choices_to_openai() {
    return this.choices.map(choice => ({
      index: choice.index,
      message: this._transform_message_to_openai(choice.message),
      finish_reason: this._get_openai_finish_reason(choice.finish_reason),
    }));
  }

  /**
   * Transform a single message to OpenAI format.
   * @param {Object} message - The message object to transform.
   * @returns {Object} Transformed message object.
   * @private
   */
  _transform_message_to_openai(message) {
    const transformed = {
      role: this._get_openai_role(message.role),
      content: this._get_openai_content(message.content),
    };

    if (message.name) transformed.name = message.name;
    if (message.tool_calls) transformed.tool_calls = this._transform_tool_calls_to_openai(message.tool_calls);
    if (message.image_url) transformed.image_url = message.image_url;

    return transformed;
  }

  /**
   * Get the OpenAI role for a given role.
   * @param {string} role - The role to transform.
   * @returns {string} The transformed role.
   * @private
   */
  _get_openai_role(role) {
    // Override in subclasses if needed
    return role;
  }

  /**
   * Get the OpenAI content for a given content.
   * @param {string} content - The content to transform.
   * @returns {string} The transformed content.
   * @private
   */
  _get_openai_content(content) {
    // Override in subclasses if needed
    return content;
  }

  /**
   * Get the OpenAI finish reason for a given finish reason.
   * @param {string} finish_reason - The finish reason to transform.
   * @returns {string} The transformed finish reason.
   * @private
   */
  _get_openai_finish_reason(finish_reason) {
    // Override in subclasses if needed
    return finish_reason;
  }

  /**
   * Transform usage to OpenAI format.
   * @returns {Object} Transformed usage object.
   * @private
   */
  _transform_usage_to_openai() {
    // Override in subclasses if needed
    return this.usage;
  }

  /**
   * Transform tool calls to OpenAI format.
   * @param {Array} tool_calls - Array of tool call objects.
   * @returns {Array} Transformed tool calls array.
   * @private
   */
  _transform_tool_calls_to_openai(tool_calls) {
    return tool_calls.map(tool_call => ({
      id: tool_call.id,
      type: tool_call.type,
      function: {
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
      },
    }));
  }
}