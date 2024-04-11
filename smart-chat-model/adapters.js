const { AnthropicAdapter } = require('./adapters/anthropic');
const { CohereAdapter } = require('./adapters/cohere');
const { GeminiAdapter } = require('./adapters/gemini');
exports.Anthropic = AnthropicAdapter;
exports.Cohere = CohereAdapter;
exports.Gemini = GeminiAdapter;

