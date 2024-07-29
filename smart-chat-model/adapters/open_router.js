class OpenRouterAdapter {
  constructor(model) { this.model = model; }
  get_tool_call(json) {
    // handles Gemini format
    if(json.choices[0].message.tool_calls){
      return json.choices[0].message.tool_calls[0].function;
    }
    // handles mistral format
    if(json.choices[0].message.content.includes("function")){
      const content = JSON.parse(json.choices[0].message.content);
      if(!content.function) return null;
      return content;
    }
    return null;
  }
  get_tool_name(tool_call) {
    if(tool_call.function) return tool_call.function; // mistral format
    if(tool_call.name) return tool_call.name; // gemini format
    return null;
  }
  get_tool_call_content(tool_call) {
    if(tool_call.parameters) return tool_call.parameters; // mistral format
    // handle gemini format
    if(tool_call.arguments){
      const args = JSON.parse(tool_call.arguments);
      // prevent escape character issues
      Object.entries(args).forEach(([key, value]) => {
        args[key] = value.replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\r/g, "\r")
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
      });
      return args;
    }
    return null;
  }
}
exports.OpenRouterAdapter = OpenRouterAdapter;