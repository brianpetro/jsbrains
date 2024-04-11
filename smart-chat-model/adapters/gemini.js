class GeminiAdapter {
  constructor(model) { this.model = model; }
  prepare_request_body(body) { return chatml_to_gemini(body); }
  get_tool_call(json) { return json.candidates?.[0]?.content?.parts?.[0]?.functionCall; }
  get_tool_name(tool_call) { return tool_call?.name; }
  get_tool_call_content(tool_call) { return tool_call?.args; }
  get_message(json) { return json.candidates?.[0]; }
  get_message_content(json) { return this.get_message(json)?.content?.parts.map(part => part.text).join(''); }
  // handle escaped newlines
  get_text_chunk_from_stream(event) { return event.data.replace(/\\n/g, '\n'); }
  // if readyState is 4, then the stream is done
  is_end_of_stream(event) { return event.source.xhr.readyState === 4; }
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
  get endpoint() { return this.model.config.endpoint + "?key=" + this.model.api_key; }
  get endpoint_streaming() { return this.model.config.endpoint_streaming + "?key=" + this.model.api_key; }
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
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      })),
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
  if(opts.tools){
    body.tools = [{
      function_declarations: opts.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }))
    }];
    body.tool_config = {
      function_calling_config: {
        mode: "ANY"
      }
    };
    const tool_prompt = `Use the "${body.tools[0].function_declarations[0].name}" tool!`;
    const last_user_idx = body.contents.findLastIndex(msg => msg.role === 'user');
    body.contents[last_user_idx].parts[0].text += '\n' + tool_prompt;
  }
  return body;
}
exports.chatml_to_gemini = chatml_to_gemini;