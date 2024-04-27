/**
 * AnthropicAdapter class provides methods to adapt the chat model interactions specifically for the Anthropic model.
 * It includes methods to prepare request bodies, count and estimate tokens, and handle tool calls and messages.
 */
class AnthropicAdapter {
  /**
   * Prepares the request body for the Anthropic API by converting ChatML format to a format compatible with Anthropic.
   * @param {Object} opts - The options object containing messages and other parameters in ChatML format.
   * @returns {Object} The request body formatted for the Anthropic API.
   */
  prepare_request_body(opts) { return chatml_to_anthropic(opts); }
  /**
   * Counts the tokens in the input by estimating them, as the Anthropic model does not provide a direct method.
   * @param {string|Object} input - The input text or object to count tokens in.
   * @returns {Promise<number>} The estimated number of tokens in the input.
   */
  async count_tokens(input) {
    // Currently, the Anthropic model does not provide a way to count tokens
    return this.estimate_tokens(input);
  }
  /**
   * Estimates the number of tokens in the input based on a rough average token size.
   * @param {string|Object} input - The input text or object to estimate tokens in.
   * @returns {number} The estimated number of tokens.
   */
  estimate_tokens(input){
    if(typeof input === 'object') input = JSON.stringify(input);
    // Note: The division by 6 is a rough estimate based on observed average token size.
    return Math.ceil(input.length / 6); // Use Math.ceil for a more accurate count
  }
  /**
   * Extracts the first tool call from the JSON response content.
   * @param {Object} json - The JSON response from which to extract the tool call.
   * @returns {Object|null} The first tool call found, or null if none exist.
   */
  get_tool_call(json){
    return json.content.find(msg => msg.type === 'tool_use');
  }
  /**
   * Retrieves the input content of a tool call.
   * @param {Object} tool_call - The tool call object from which to extract the input.
   * @returns {Object} The input of the tool call.
   */
  get_tool_call_content(tool_call){
    return tool_call.input;
  }
  /**
   * Retrieves the name of the tool from a tool call object.
   * @param {Object} tool_call - The tool call object from which to extract the name.
   * @returns {string} The name of the tool.
   */
  get_tool_name(tool_call){
    return tool_call.name;
  }
  /**
   * Extracts the first message from the JSON response content.
   * @param {Object} json - The JSON response from which to extract the message.
   * @returns {Object|null} The first message found, or null if none exist.
   */
  get_message(json){ return json.content?.[0]; }
  /**
   * Retrieves the content of the first message from the JSON response.
   * @param {Object} json - The JSON response from which to extract the message content.
   * @returns {string|null} The content of the first message, or null if no message is found.
   */
  get_message_content(json) { return this.get_message(json)?.[this.get_message(json)?.type]; }
}
exports.AnthropicAdapter = AnthropicAdapter;
// https://docs.anthropic.com/claude/reference/messages_post
/**
 * Convert a ChatML object to an Anthropic object
 * @param {Object} opts - The ChatML object
 * @description This function converts a ChatML object to an Anthropic object. It filters out system messages and adds a system message prior to the last user message.
 * @returns {Object} - The Anthropic object
 */
function chatml_to_anthropic(opts) {
  const messages = opts.messages
    .filter(msg => msg.role !== 'system')
    .map(m => {
      if(typeof m.content === 'string') return { role: m.role, content: m.content };
      if(Array.isArray(m.content)){
        const content = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        return { role: m.role, content };
      }
      return m;
    })
  ;
  const { model, max_tokens, temperature, tools, } = opts;
  // DO: handled better (Smart Connections specific)
  // get index of last system message
  const last_system_idx = opts.messages.findLastIndex(msg => msg.role === 'system' && msg.content.includes('---BEGIN'));
  if (last_system_idx > -1) {
    const system_prompt = '<context>\n' + opts.messages[last_system_idx].content + '\n</context>\n';
    messages[messages.length - 1].content = system_prompt + messages[messages.length - 1].content;
  }
  console.log(messages);
  const out = {
    messages,
    model,
    max_tokens,
    temperature,
  }
  if(tools){
    out.tools = tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
    // add "Use the ${tool.name} tool" to the last user message
    const tool_prompt = `Use the "${out.tools[0].name}" tool!`;
    const last_user_idx = out.messages.findLastIndex(msg => msg.role === 'user');
    out.messages[last_user_idx].content += '\n' + tool_prompt;
    out.system = `Required: use the "${out.tools[0].name}" tool!`;
  }
  // DO: handled better (Smart Connections specific)
  // if system message exists prior to last_system_idx AND does not include "---BEGIN" then add to body.system
  const last_non_context_system_idx = opts.messages.findLastIndex(msg => msg.role === 'system' && !msg.content.includes('---BEGIN'));
  if(last_non_context_system_idx > -1) out.system = opts.messages[last_non_context_system_idx].content;
  return out;
}
exports.chatml_to_anthropic = chatml_to_anthropic;

