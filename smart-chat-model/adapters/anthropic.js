class AnthropicAdapter {
  prepare_request_body(opts) { return chatml_to_anthropic(opts); }
  async count_tokens(input) {
    // Currently, the Anthropic model does not provide a way to count tokens
    return this.estimate_tokens(input);
  }
  estimate_tokens(input){
    if(typeof input === 'object') input = JSON.stringify(input);
    // Note: The division by 6 is a rough estimate based on observed average token size.
    return Math.ceil(input.length / 6); // Use Math.ceil for a more accurate count
  }
  get_tool_call(json){
    return json.content.find(msg => msg.type === 'tool_use');
  }
  get_tool_call_content(tool_call){
    return tool_call.input;
  }
  get_tool_name(tool_call){
    return tool_call.name;
  }
  get_message(json){ return json.content?.[0]; }
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
  const messages = opts.messages.filter(msg => msg.role !== 'system');
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
  }
  // DO: handled better (Smart Connections specific)
  // if system message exists prior to last_system_idx AND does not include "---BEGIN" then add to body.system
  const last_non_context_system_idx = opts.messages.findLastIndex(msg => msg.role === 'system' && !msg.content.includes('---BEGIN'));
  if(last_non_context_system_idx > -1) out.system = opts.messages[last_non_context_system_idx].content;
  return out;
}
exports.chatml_to_anthropic = chatml_to_anthropic;

