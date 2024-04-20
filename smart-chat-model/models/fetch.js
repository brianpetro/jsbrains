const { fetch_open_router_models } = require('./open_router');
const { fetch_openai_models } = require('./openai');
const { fetch_google_gemini_models } = require('./google_gemini');
const { fetch_cohere_models } = require('./cohere');
const { fetch_anthropic_models } = require('./anthropic');
exports.open_router = fetch_open_router_models;
exports.openai = fetch_openai_models;
exports.google_gemini = fetch_google_gemini_models;
exports.cohere = fetch_cohere_models;
exports.anthropic = fetch_anthropic_models;

