import { SmartChatModelApiAdapter } from './_api.js';

// Define local platforms
const local_platforms = ['custom_local', 'ollama', 'lm_studio'];

export class SmartChatModelCustomAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Custom API (Local or Remote, OpenAI format)",
    type: "API"
  }

  get settings_config() {
    return {
      // LOCAL PLATFORM SETTINGS
      "[CHAT_ADAPTER].model_name": {
        name: 'Model Name',
        type: "text",
        description: "Enter the model name for the local chat model platform.",
      },
      "[CHAT_ADAPTER].protocol": {
        name: 'Protocol',
        type: "text",
        description: "Enter the protocol for the local chat model.",
      },
      "[CHAT_ADAPTER].hostname": {
        name: 'Hostname',
        type: "text",
        description: "Enter the hostname for the local chat model.",
      },
      "[CHAT_ADAPTER].port": {
        name: 'Port',
        type: "number",
        description: "Enter the port for the local chat model.",
      },
      "[CHAT_ADAPTER].path": {
        name: 'Path',
        type: "text",
        description: "Enter the path for the local chat model.",
      },
      "[CHAT_ADAPTER].streaming": {
        name: 'Streaming',
        type: "toggle",
        description: "Enable streaming for the local chat model.",
      },
      "[CHAT_ADAPTER].max_input_tokens": {
        name: 'Max Input Tokens',
        type: "number",
        description: "Enter the maximum number of input tokens for the chat model.",
      },
    };
  }
}
