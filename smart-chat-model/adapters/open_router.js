class OpenRouterAdapter {
  constructor(model) { this.model = model; }
  get_tool_call(json) {
    return JSON.parse(json.choices[0].message.content);
  }
  get_tool_name(tool_call) {
    return tool_call.function;
  }
  get_tool_call_content(tool_call) {
    return tool_call.parameters;
  }
}
exports.OpenRouterAdapter = OpenRouterAdapter;