/**
 * GeminiAdapter class provides methods to adapt the chat model interactions specifically for the Gemini model.
 * It includes methods to prepare request bodies, handle tool calls and messages, and manage streaming responses.
 */
class GeminiAdapter {
  /**
   * Constructs a GeminiAdapter instance with a specified model configuration.
   * @param {Object} model - The model configuration object.
   */
  constructor(model) { this.model = model; }

  /**
   * Prepares the request body for the Gemini API by converting ChatML format to a format compatible with Gemini.
   * @param {Object} body - The options object containing messages and other parameters in ChatML format.
   * @returns {Object} The request body formatted for the Gemini API.
   */
  prepare_request_body(body) { return chatml_to_gemini(body); }

  /**
   * Extracts the first tool call from the JSON response content.
   * @param {Object} json - The JSON response from which to extract the tool call.
   * @returns {Object|null} The first tool call found, or null if none exist.
   */
  get_tool_call(json) { return json.candidates?.[0]?.content?.parts?.[0]?.functionCall; }

  /**
   * Retrieves the name of the tool from a tool call object.
   * @param {Object} tool_call - The tool call object from which to extract the name.
   * @returns {string|null} The name of the tool, or null if not available.
   */
  get_tool_name(tool_call) { return tool_call?.name; }

  /**
   * Retrieves the input content of a tool call.
   * @param {Object} tool_call - The tool call object from which to extract the input.
   * @returns {Object|null} The input of the tool call, or null if not available.
   */
  get_tool_call_content(tool_call) { return tool_call?.args; }

  /**
   * Extracts the first message from the JSON response content.
   * @param {Object} json - The JSON response from which to extract the message.
   * @returns {Object|null} The first message found, or null if none exist.
   */
  get_message(json) { return json.candidates?.[0]; }

  /**
   * Retrieves the content of the first message from the JSON response.
   * @param {Object} json - The JSON response from which to extract the message content.
   * @returns {string|null} The content of the first message, or null if no message is found.
   */
  get_message_content(json) { return this.get_message(json)?.content?.parts.map(part => part.text).join(''); }

  /**
   * Handles escaped newlines in a streaming text chunk.
   * @param {Object} event - The streaming event containing the data.
   * @returns {string} The text chunk with escaped newlines replaced.
   */
  get_text_chunk_from_stream(event) { return event.data.replace(/\\n/g, '\n'); }

  /**
   * Determines if the streaming response has ended based on the readyState of the XMLHttpRequest.
   * @param {Object} event - The streaming event.
   * @returns {boolean} True if the stream has ended, false otherwise.
   */
  is_end_of_stream(event) { return event.source.xhr.readyState === 4; }

  /**
   * Counts the tokens in the input by making an API request to the Gemini token counting endpoint.
   * @param {string|Object} input - The input text or object to count tokens in.
   * @returns {Promise<number>} The total number of tokens in the input.
   */
  async count_tokens(input) {
    const req = {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:countTokens?key=${this.model.api_key}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    let body;
    if(typeof input === 'string') body = chatml_to_gemini({ messages: [{ role: 'user', content: input }] });
    else if (Array.isArray(input)) body = chatml_to_gemini({ messages: input });
    else if (typeof input === 'object') body = chatml_to_gemini(input);
    else return console.error("Invalid input for count_tokens", input);
    delete body.generationConfig;
    delete body.safetySettings;
    req.body = JSON.stringify(body);
    const resp = await this.model.request_adapter(req);
    return resp?.json?.totalTokens;
  }

  /**
   * Getter for the standard API endpoint with the API key appended.
   * @returns {string} The formatted endpoint URL for non-streaming requests.
   */
  get endpoint() { return this.model.config.endpoint.replace('MODEL_NAME', this.model.model_name) + "?key=" + this.model.api_key; }

  /**
   * Getter for the streaming API endpoint with the API key appended.
   * @returns {string} The formatted endpoint URL for streaming requests.
   */
  get endpoint_streaming() { return this.model.config.endpoint_streaming.replace('MODEL_NAME', this.model.model_name) + "?key=" + this.model.api_key; }
}
exports.GeminiAdapter = GeminiAdapter;

/**
 * Convert a ChatML object to a Gemini object
 * @param {Object} opts - The ChatML object
 * @description This function converts a ChatML object to a Gemini object. It filters out system messages and adds a system message prior to the last user message.
 * @returns {Object} - The Gemini object
 */
function chatml_to_gemini(opts) {
  // // deep copy messages
  // const messages = JSON.parse(JSON.stringify(opts.messages)).filter(msg => msg.role !== 'system');
  // // merge system roles intom subsequent user roles
  // opts.messages.forEach((msg, i) => {
  //   if (msg.role === 'system') {
  //     if (!messages[i + 1]) return console.error("System message without subsequent user message");
  //     const system_prompt = '---BEGIN IMPORTANT CONTEXT---\n' + msg.content + '\n---END IMPORTANT CONTEXT---\n\n';
  //     messages[i + 1].content = system_prompt + (messages[i + 1].content || '');
  //   }
  // });
  const messages = opts.messages.filter(msg => msg.role !== 'system');
  // DO: handled better (Smart Connections specific)
  // get index of last system message
  const last_system_idx = opts.messages.findLastIndex(msg => msg.role === 'system' && msg.content.includes('---BEGIN'));
  if (last_system_idx > -1) {
    const system_prompt = '---BEGIN IMPORTANT CONTEXT---\n' + opts.messages[last_system_idx].content + '\n---END IMPORTANT CONTEXT---\n\n';
    messages[messages.length - 1].content = system_prompt + messages[messages.length - 1].content;
  }
  const body = {
    contents: messages
      .filter(msg => msg.role !== 'system') // filter out system messages
      .map(msg => {
        const content = {};
        content.role = msg.role === 'assistant' ? 'model' : msg.role;
        content.parts = !Array.isArray(msg.content) ? [{text: msg.content}] : msg.content.map(c => {
          if(c.type === 'text'){
            return {text: c.text};
          }
          if(c.type === 'image_url'){
            const image_url = c.image_url.url;
            let mime_type = image_url.split(":")[1].split(";")[0];
            if(mime_type === 'image/jpg') mime_type = 'image/jpeg';
            return {inline_data: {mime_type: mime_type, data: image_url.split(",")[1]}};
          }
        });
        return content;
        ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: Array.isArray(msg.content) ? [{text: msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n')}] : [{ text: msg.content }]
        })
      })
    ,
    generationConfig: {
      temperature: opts.temperature || 0.9,
      topK: opts.topK || 1,
      topP: opts.topP || 1,
      maxOutputTokens: opts.max_tokens || 2048,
      stopSequences: opts.stopSequences || [],
      candidate_count: opts.n || 1,
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
  const system_instructions = opts.messages.filter(msg => msg.role === 'system' && !msg.content.includes('---BEGIN'));
  if(system_instructions.length > 0) body.systemInstruction = { parts: system_instructions.map(msg => ({ text: msg.content })) };
  if(opts.tools){
    body.tools = [{
      function_declarations: opts.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }))
    }];
    if(opts.tool_choice){
      if(opts.tool_choice !== 'auto'){
        if(opts.model.includes('1.5') || opts.model.includes('flash')){ // mode=ANY and system instructions available in 1.5-pro and 1.5-flash
          body.tool_config = {
            function_calling_config: {
              mode: "ANY",
              allowed_function_names: opts.tools.map(tool => tool.function.name),
            }
          };
          body.systemInstruction = {
            role: 'user',
            parts: [
              {
                text: `IMPORTANT: You must use the "${body.tools[0].function_declarations[0].name}" function tool!`
              }
            ]
          };
        }
        // system instructions and function config not available in 1.0
        const tool_prompt = `IMPORTANT: You must use the "${body.tools[0].function_declarations[0].name}" function tool!`;
        const last_user_idx = body.contents.findLastIndex(msg => msg.role === 'user');
        body.contents[last_user_idx].parts[0].text += '\n\n' + tool_prompt;
      }
    }
  }
  return body;
}
exports.chatml_to_gemini = chatml_to_gemini;