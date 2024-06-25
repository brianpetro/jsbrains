// fake it because anthropic doesn't have model list API endpoint
async function fetch_anthropic_models() {
  return [
    {
      "key": "claude-3-opus-20240229",
      "model_name": "claude-3-opus-20240229",
      "description": "Anthropic's Claude Opus",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      key: "claude-3-5-sonnet-20240620",
      "model_name": "claude-3-sonnet-20240229",
      "description": "Anthropic's Claude Sonnet",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      key: "claude-3-haiku-20240307",
      "model_name": "claude-3-haiku-20240307",
      "description": "Anthropic's Claude Haiku",
      "max_input_tokens": 200000,
        "max_output_tokens": 4000,
        "multimodal": true
    },
    {
      key: "claude-3-sonnet-20240229",
      "model_name": "claude-3-sonnet-20240229",
      "description": "Anthropic's Claude Sonnet",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
  ];
}
exports.fetch_anthropic_models = fetch_anthropic_models;

