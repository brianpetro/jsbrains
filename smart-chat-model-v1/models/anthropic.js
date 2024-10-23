// fake it because anthropic doesn't have model list API endpoint
async function fetch_anthropic_models() {
  return [
    {
      key: "claude-3-5-sonnet-latest",
      "model_name": "claude-3.5-sonnet-latest",
      "description": "Anthropic's Claude Sonnet (Latest)",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      "key": "claude-3-opus-20240229",
      "model_name": "claude-3-opus-20240229",
      "description": "Anthropic's Claude Opus",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      key: "claude-3-haiku-20240307",
      "model_name": "claude-3-haiku-20240307",
      "description": "Anthropic's Claude Haiku (2024-03-07)",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      key: "claude-3-5-sonnet-20241022",
      "model_name": "claude-3.5-sonnet-20241022",
      "description": "Anthropic's Claude Sonnet (2024-10-22)",
      "max_input_tokens": 200000,
      "max_output_tokens": 4000,
      "multimodal": true
    },
    {
      key: "claude-3-5-sonnet-20240620",
      "model_name": "claude-3.5-sonnet-20240620",
      "description": "Anthropic's Claude Sonnet (2024-06-20)",
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

