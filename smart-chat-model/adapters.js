import { SmartChatModelAnthropicAdapter } from './adapters/anthropic.js';
import { SmartChatModelAzureAdapter } from './adapters/azure.js';
import { SmartChatModelOpenaiAdapter } from './adapters/openai.js';
import { SmartChatModelGoogleAdapter, SmartChatModelGeminiAdapter } from './adapters/google.js';
import { SmartChatModelCohereAdapter } from './adapters/cohere.js';
import { SmartChatModelOpenRouterAdapter } from './adapters/open_router.js';
import { SmartChatModelCustomAdapter } from './adapters/_custom.js';
import { SmartChatModelOllamaAdapter } from './adapters/ollama.js';
import { SmartChatModelLmStudioAdapter } from './adapters/lm_studio.js';
import { SmartChatModelGroqAdapter } from './adapters/groq.js';
import { SmartChatModelXaiAdapter }  from './adapters/xai.js';
import { SmartChatModelDeepseekAdapter } from './adapters/deepseek.js';
export {
  SmartChatModelAnthropicAdapter,
  SmartChatModelAzureAdapter,
  SmartChatModelOpenaiAdapter,
  SmartChatModelGoogleAdapter,
  SmartChatModelCohereAdapter,
  SmartChatModelOpenRouterAdapter,
  SmartChatModelCustomAdapter,
  SmartChatModelOllamaAdapter,
  SmartChatModelLmStudioAdapter,
  SmartChatModelGroqAdapter,
  SmartChatModelXaiAdapter,
  SmartChatModelDeepseekAdapter,
  SmartChatModelAnthropicAdapter as anthropic,
  SmartChatModelAzureAdapter as azure,
  SmartChatModelCohereAdapter as cohere,
  SmartChatModelCustomAdapter as custom,
  SmartChatModelGoogleAdapter as google,
  SmartChatModelGroqAdapter as groq,
  SmartChatModelLmStudioAdapter as lm_studio,
  SmartChatModelOllamaAdapter as ollama,
  SmartChatModelOpenaiAdapter as openai,
  SmartChatModelOpenRouterAdapter as open_router,
  SmartChatModelXaiAdapter as xai,
  SmartChatModelDeepseekAdapter as deepseek,
  // DEPRECATED
  SmartChatModelGeminiAdapter,
  SmartChatModelGeminiAdapter as gemini
};
