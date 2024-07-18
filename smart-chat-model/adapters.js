const { AnthropicAdapter } = require('./adapters/anthropic');
const { CohereAdapter } = require('./adapters/cohere');
const { GeminiAdapter } = require('./adapters/gemini');
const { OpenRouterAdapter } = require('./adapters/open_router');
exports.Anthropic = AnthropicAdapter;
exports.Cohere = CohereAdapter;
exports.Gemini = GeminiAdapter;
exports.OpenRouter = OpenRouterAdapter;

