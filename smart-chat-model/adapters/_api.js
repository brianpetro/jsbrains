import { SmartHttpRequest } from "smart-http-request";
import { SmartStreamer } from '../streamer.js'; // move to smart-http-request???
import { SmartChatModelAdapter } from './_adapter.js';
import { SmartHttpRequestFetchAdapter } from "smart-http-request/adapters/fetch.js";

/**
 * Base API adapter class for SmartChatModel.
 * Handles HTTP requests and response processing for remote chat services.
 * @abstract
 * @class SmartChatModelApiAdapter
 * @extends SmartChatModelAdapter
 * 
 * @property {SmartHttpRequest} _http_adapter - The HTTP adapter instance
 * @property {SmartChatModelRequestAdapter} req_adapter - The request adapter class
 * @property {SmartChatModelResponseAdapter} res_adapter - The response adapter class
 */
export class SmartChatModelApiAdapter extends SmartChatModelAdapter {
  
  /**
   * Get the request adapter class.
   * @returns {SmartChatModelRequestAdapter} The request adapter class
   */
  get req_adapter() { return SmartChatModelRequestAdapter; }

  /**
   * Get the response adapter class.
   * @returns {SmartChatModelResponseAdapter} The response adapter class
   */
  get res_adapter() { return SmartChatModelResponseAdapter; }

  /**
   * Get or initialize the HTTP adapter.
   * @returns {SmartHttpRequest} The HTTP adapter instance
   */
  get http_adapter() {
    if (!this._http_adapter) {
      if (this.model.opts.http_adapter) this._http_adapter = this.model.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest({ adapter: SmartHttpRequestFetchAdapter });
    }
    return this._http_adapter;
  }

  /**
   * Get the settings configuration for the API adapter.
   * @returns {Object} Settings configuration object with API key and other settings
   */
  get settings_config() {
    return {
      ...super.settings_config,
      "[CHAT_ADAPTER].api_key": {
        name: 'API Key',
        type: "password",
        description: "Enter your API key for the chat model platform.",
        callback: 'test_api_key',
        is_scope: true, // trigger re-render of settings when changed (reload models dropdown)
      },
    };
  }

  /**
   * Count tokens in the input text.
   * @abstract
   * @param {string|Object} input - Text or message object to count tokens for
   * @returns {Promise<number>} Number of tokens in the input
   */
  async count_tokens(input) { throw new Error("count_tokens not implemented"); }

  /**
   * Get the parameters for requesting available models.
   * @returns {Object} Request parameters for models endpoint
   */
  get models_request_params() {
    return {
      url: this.models_endpoint,
      method: this.models_endpoint_method,
      headers: {
        'Authorization': `Bearer ${this.api_key}`,
      },
    };
  }

  /**
   * Validate parameters required for getting models.
   * @returns {true|Array<Object>} True if valid, array of error objects if invalid
   */
  validate_get_models_params() {
    if(!this.adapter_config.models_endpoint){
      const err_msg = `${this.model.adapter_name} models endpoint required to retrieve models`;
      console.warn(err_msg);
      return [{value: '', name: err_msg}];
    }
    if(!this.api_key) {
      const err_msg = `${this.model.adapter_name} API key required to retrieve models`;
      console.warn(err_msg);
      return [{value: '', name: err_msg}];
    }
    return true;
  }

  /**
   * Get available models from the API.
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh=false) {
    if(!refresh
      && this.adapter_config?.models
      && typeof this.adapter_config.models === 'object'
      && Object.keys(this.adapter_config.models).length > 0
    ) return this.adapter_config.models; // return cached models if not refreshing
    try {
      const response = await this.http_adapter.request(this.models_request_params);
      const model_data = this.parse_model_data(await response.json());
      this.adapter_settings.models = model_data; // set to adapter_settings to persist
      this.model.re_render_settings(); // re-render settings to update models dropdown
      return model_data;
    } catch (error) {
      console.error('Failed to fetch model data:', error);
      return {"_": {id: `Failed to fetch models from ${this.model.adapter_name}`}};
    }
  }

  /**
   * Parses the raw model data from OpenAI API and transforms it into a more usable format.
   * @param {Object} model_data - The raw model data received from OpenAI API.
   * @returns {Array<Object>} An array of parsed model objects with the following properties:
   *   @property {string} model_name - The name/ID of the model as returned by the API.
   *   @property {string} id - The id used to identify the model (usually same as model_name).
   *   @property {boolean} multimodal - Indicates if the model supports multimodal inputs.
   *   @property {number} [max_input_tokens] - The maximum number of input tokens the model can process.
   *   @property {string} [description] - A description of the model's context and output capabilities.
   */
  parse_model_data(model_data) {
    throw new Error("parse_model_data not implemented"); // requires platform-specific implementation
  }

  /**
   * Complete a chat request.
   * @param {Object} req - Request parameters
   * @returns {Promise<Object>} Completion response in OpenAI format
   */
  async complete(req) {
    const _req = new this.req_adapter(this, {
      ...req,
      stream: false,
    });
    const request_params = _req.to_platform();
    const http_resp = await this.http_adapter.request(request_params);
    if(!http_resp) return null;
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

    /**
   * Stream chat responses.
   * @param {Object} req - Request parameters
   * @param {Object} handlers - Event handlers for streaming
   * @param {Function} handlers.chunk - Handler for response objects
   * @param {Function} handlers.error - Handler for errors
   * @param {Function} handlers.done - Handler for completion
   * @returns {Promise<Object>} Complete response object
   */
  async stream(req, handlers = {}) {
    const _req = new this.req_adapter(this, req);
    const request_params = _req.to_platform(true);
    if(this.streaming_chunk_splitting_regex) request_params.chunk_splitting_regex = this.streaming_chunk_splitting_regex; // handle Google's BS
    
    return await new Promise((resolve, reject) => {
      try {
        this.active_stream = new SmartStreamer(this.endpoint_streaming, request_params);
        const resp_adapter = new this.res_adapter(this);
        
        this.active_stream.addEventListener("message", async (e) => {
          // console.log('message', e);
          if (this.is_end_of_stream(e)) {
            await resp_adapter.handle_chunk(e.data);
            this.stop_stream();
            const final_resp = resp_adapter.to_openai();
            handlers.done && await handlers.done(final_resp);
            // should return the final aggregated response if needed
            resolve(final_resp);
            return;
          }
          
          try {
            resp_adapter.handle_chunk(e.data);
            handlers.chunk && await handlers.chunk(resp_adapter.to_openai());
          } catch (error) {
            console.error('Error processing stream chunk:', error);
            handlers.error && handlers.error(e.data);
            this.stop_stream();
            reject(error);
          }
        });
        
        this.active_stream.addEventListener("error", (e) => {
          console.error('Stream error:', e);
          handlers.error && handlers.error("*API Error. See console logs for details.*");
          this.stop_stream();
          reject(e);
        });
        
        this.active_stream.stream();
      } catch (err) {
        console.error('Failed to start stream:', err);
        handlers.error && handlers.error("*API Error. See console logs for details.*");
        this.stop_stream();
        reject(err);
      }
    });
  }

  /**
   * Check if a stream event indicates end of stream.
   * @param {Event} event - Stream event
   * @returns {boolean} True if end of stream
   */
  is_end_of_stream(event) {
    return event.data === "data: [DONE]"; // use default OpenAI format
  }

  /**
   * Stop active stream.
   */
  stop_stream() {
    if (this.active_stream) {
      this.active_stream.end();
      this.active_stream = null;
    }
  }

  /**
   * Validate Anthropic adapter configuration.
   * @returns {Object} { valid: boolean, message: string }
   */
  validate_config() {
    if(!this.adapter_config.model_key || this.adapter_config.model_key === 'undefined') return { valid: false, message: "No model selected." };
    if (!this.api_key) {
      return { valid: false, message: "API key is missing." };
    }
    // check if model supports tool calls
    if(!this.can_use_tools) {
      return { valid: false, message: "Selected model does not support tools." };
    }
    // Add more adapter-specific validations here
    return { valid: true, message: "Configuration is valid." };
  }

  /**
   * Get the API key.
   * @returns {string} The API key.
   */
  get api_key() {
    return this.main.opts.api_key // opts added at init take precedence
      || this.adapter_config?.api_key // then adapter settings
    ;
  }

  /**

   * Get the number of choices.
   * @returns {number} The number of choices.
   */
  get choices() { return this.adapter_config.choices; }



  get models_endpoint() { return this.adapter_config.models_endpoint; }
  get models_endpoint_method() { return 'POST'; }

  /**
   * Get the endpoint URL.
   * @returns {string} The endpoint URL.
   */
  get endpoint() { return this.adapter_config.endpoint; }

  /**
   * Get the streaming endpoint URL.
   * @returns {string} The streaming endpoint URL.
   */
  get endpoint_streaming() { return this.adapter_config.endpoint_streaming || this.endpoint; }

  /**
   * Get the maximum output tokens.
   * @returns {number} The maximum output tokens.
   */
  get max_output_tokens() { return this.adapter_config.max_output_tokens || 3000; }


  /**
   * Get the temperature.
   * @returns {number} The temperature.
   */
  get temperature() { return this.adapter_config.temperature; }
}

/**
 * Base class for request adapters to handle various input schemas and convert them to OpenAI schema.
 * @class SmartChatModelRequestAdapter
 * 
 * @property {SmartChatModelAdapter} adapter - The parent adapter instance
 * @property {Object} _req - The original request object
 */
export class SmartChatModelRequestAdapter {
  /**
   * @constructor
   * @param {SmartChatModelAdapter} adapter - The SmartChatModelAdapter instance
   * @param {Object} req - The incoming request object
   */
  constructor(adapter, req = {}) {
    this.adapter = adapter;
    this._req = req;
  }

  /**
   * Get the messages array from the request
   * @returns {Array<Object>} Array of message objects
   */
  get messages() {
    return this._req.messages || [];
  }

  /**
   * Get the model identifier
   * @returns {string} Model ID
   */
  get model() {
    return this._req.model || this.adapter.model_config.id;
  }

  /**
   * Get the temperature setting
   * @returns {number} Temperature value
   */
  get temperature() {
    return this._req.temperature;
  }

  /**
   * Get the maximum tokens setting
   * @returns {number} Max tokens value
   */
  get max_tokens() {
    return this._req.max_tokens || this.adapter.model_config.max_output_tokens;
  }

  /**
   * Get the streaming flag
   * @returns {boolean} Whether to stream responses
   */
  get stream() {
    return this._req.stream;
  }

  /**
   * Get the tools array
   * @returns {Array<Object>|null} Array of tool objects or null
   */
  get tools() {
    return this._req.tools || null;
  }

  /**
   * Get the tool choice setting
   * @returns {string|Object|null} Tool choice configuration
   */
  get tool_choice() {
    return this._req.tool_choice || null;
  }

  get frequency_penalty() {
    return this._req.frequency_penalty;
  }

  get presence_penalty() {
    return this._req.presence_penalty;
  }

  get top_p() {
    return this._req.top_p;
  }

  /**
   * Get request headers
   * @returns {Object} Headers object
   */
  get_headers() {
    const headers = {
      "Content-Type": "application/json",
      ...(this.adapter.adapter_config.headers || {}),
    };

    if(this.adapter.adapter_config.api_key_header !== 'none') {
      if (this.adapter.adapter_config.api_key_header){
        headers[this.adapter.adapter_config.api_key_header] = this.adapter.api_key;
      }else if(this.adapter.api_key) {
        headers['Authorization'] = `Bearer ${this.adapter.api_key}`;
      }
    }

    return headers;
  }

  /**
   * Convert request to platform-specific format
   * @returns {Object} Platform-specific request parameters
   */
  to_platform(streaming = false) { return this.to_openai(streaming); }

  /**
   * Convert request to OpenAI format
   * @returns {Object} Request parameters in OpenAI format
   */
  to_openai(streaming = false) {
    const body = {
      messages: this._transform_messages_to_openai(),
      model: this.model,
      max_tokens: this.max_tokens,
      temperature: this.temperature,
      stream: streaming,
      ...(this.tools && { tools: this._transform_tools_to_openai() }),
    };
    if((body.tools?.length > 0) && this.tool_choice && this.tool_choice !== 'none'){
      // no tool choice if no tools
      body.tool_choice = this.tool_choice;
    }
    // special handling for o1 models
    if(this.model?.startsWith('o1-')){
      body.messages = body.messages.filter(m => m.role !== 'system'); // remove system messages (not supported by o1 models)
      delete body.temperature; // not supported by o1 models
    }
    if(typeof this._req.top_p === 'number') body.top_p = this._req.top_p;
    if(typeof this._req.presence_penalty === 'number') body.presence_penalty = this._req.presence_penalty;
    if(typeof this._req.frequency_penalty === 'number') body.frequency_penalty = this._req.frequency_penalty;

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      headers: this.get_headers(),
      body: JSON.stringify(body)
    };
  }

  /**
   * Transform messages to OpenAI format
   * @returns {Array<Object>} Transformed messages array
   * @private
   */
  _transform_messages_to_openai() {
    return this.messages.map(message => this._transform_single_message_to_openai(message));
  }

  /**
   * Transform a single message to OpenAI format
   * @param {Object} message - Message object to transform
   * @returns {Object} Transformed message object
   * @private
   */
  _transform_single_message_to_openai(message) {
    const transformed = {
      role: this._get_openai_role(message.role),
      content: this._get_openai_content(message),
    };

    if (message.name) transformed.name = message.name;
    if (message.tool_calls) transformed.tool_calls = this._transform_tool_calls_to_openai(message.tool_calls);
    if (message.image_url) transformed.image_url = message.image_url;
    if (message.tool_call_id) transformed.tool_call_id = message.tool_call_id;

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
  _get_openai_content(message) {
    // Override in subclasses if needed
    return message.content;
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
 * @class SmartChatModelResponseAdapter
 * 
 * @property {SmartChatModelAdapter} adapter - The parent adapter instance
 * @property {Object} _res - The original response object
 */
export class SmartChatModelResponseAdapter {
  // must be getter to prevent erroneous assignment
  static get platform_res() {
    return {
      id: '',
      object: 'chat.completion',
      created: 0,
      model: '',
      choices: [],
      usage: {},
    };
  }
  /**
   * @constructor
   * @param {SmartChatModelAdapter} adapter - The SmartChatModelAdapter instance
   * @param {Object} res - The response object
   */
  constructor(adapter, res) {
    this.adapter = adapter;
    this._res = res || this.constructor.platform_res;
  }

  /**
   * Get response ID
   * @returns {string|null} Response ID
   */
  get id() {
    return this._res.id || null;
  }

  /**
   * Get response object type
   * @returns {string|null} Object type
   */
  get object() {
    return this._res.object || null;
  }

  /**
   * Get creation timestamp
   * @returns {number|null} Creation timestamp
   */
  get created() {
    return this._res.created || null;
  }

  /**
   * Get response choices
   * @returns {Array<Object>} Array of choice objects
   */
  get choices() {
    return this._res.choices || [];
  }

  /**
   * Get first tool call if present
   * @returns {Object|null} Tool call object
   */
  get tool_call() {
    return this.message.tool_calls?.[0] || null;
  }

  /**
   * Get tool name from first tool call
   * @returns {string|null} Tool name
   */
  get tool_name() {
    return this.tool_call?.tool_name || null;
  }

  /**
   * Get tool call parameters
   * @returns {Object|null} Tool parameters
   */
  get tool_call_content() {
    return this.tool_call?.parameters || null;
  }

  /**
   * Get token usage statistics
   * @returns {Object|null} Usage statistics
   */
  get usage() {
    return this._res.usage || null;
  }

  get error() {
    return this._res.error || null;
  }

  /**
   * Convert response to OpenAI format
   * @returns {Object} Response in OpenAI format
   */
  to_openai() {
    const res = {
      id: this.id,
      object: this.object,
      created: this.created,
      choices: this._transform_choices_to_openai(),
      usage: this._transform_usage_to_openai(),
      raw: this._res,
    };
    if(this.error) res.error = this.error;
    return res;
  }

  /**
   * Parse chunk adds delta to content as expected output format
   */
  handle_chunk(chunk) {
    if(chunk === 'data: [DONE]') return;
    chunk = JSON.parse(chunk.split('data: ')[1] || '{}');
    if(Object.keys(chunk).length === 0) return;
    if(!this._res.choices[0]){
      this._res.choices.push({
        message: {
          index: 0,
          role: 'assistant',
          content: '',
        },
      });
    }
    if(!this._res.id){
      this._res.id = chunk.id;
    }
    if(chunk.choices?.[0]?.delta?.content){
      this._res.choices[0].message.content += chunk.choices[0].delta.content;
    }
    if(chunk.choices?.[0]?.delta?.tool_calls){
      if(!this._res.choices[0].message.tool_calls){
        this._res.choices[0].message.tool_calls = [{
          id: '',
          type: 'function',
          function: {
            name: '',
            arguments: '',
          },
        }];
      }
      if(chunk.choices[0].delta.tool_calls[0].id){
        this._res.choices[0].message.tool_calls[0].id += chunk.choices[0].delta.tool_calls[0].id;
      }
      if(chunk.choices[0].delta.tool_calls[0].function.name){
        this._res.choices[0].message.tool_calls[0].function.name += chunk.choices[0].delta.tool_calls[0].function.name;
      }
      if(chunk.choices[0].delta.tool_calls[0].function.arguments){
        this._res.choices[0].message.tool_calls[0].function.arguments += chunk.choices[0].delta.tool_calls[0].function.arguments;
      }
    }
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
  _transform_message_to_openai(message={}) {
    const transformed = {
      role: this._get_openai_role(message.role),
      content: this._get_openai_content(message),
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
  _get_openai_content(message) {
    // Override in subclasses if needed
    return message.content;
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