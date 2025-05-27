import { SmartEmbedAdapter } from "./adapters/_adapter.js";
import { SmartEmbedOpenAIAdapter } from "./adapters/openai.js";
import { SmartEmbedTransformersAdapter } from "./adapters/transformers.js";
import { SmartEmbedTransformersIframeAdapter } from "./adapters/transformers_iframe.js";
import { SmartEmbedOllamaAdapter } from "./adapters/ollama.js";

export {
  SmartEmbedAdapter as _default,
  SmartEmbedOpenAIAdapter as openai,
  SmartEmbedTransformersAdapter as transformers,
  SmartEmbedTransformersIframeAdapter as transformers_iframe,
  SmartEmbedOllamaAdapter as ollama,
};