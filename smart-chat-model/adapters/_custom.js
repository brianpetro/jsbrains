import { SmartChatModelApiAdapter, SmartChatModelRequestAdapter } from './_api.js';

// Define local platforms
const local_platforms = ['custom_local', 'ollama', 'lm_studio'];

export class SmartChatModelCustomAdapter extends SmartChatModelApiAdapter {
  static defaults = {
    description: "Custom API (Local or Remote, OpenAI format)",
    type: "API"
  }

  req_adapter = SmartChatModelCustomRequestAdapter;

  get custom_protocol() {
    return this.adapter_config.protocol || 'http';
  }
  get custom_hostname(){
    return this.adapter_config.hostname || 'localhost';
  }
  get custom_port(){
    return this.adapter_config.port ? `:${this.adapter_config.port}` : '';
  }
  get custom_path(){
    let path = this.adapter_config.path || '';
    if(path && !path.startsWith('/')) path = `/${path}`;
    return path;
  }

  get endpoint() {
    return [
      this.custom_protocol,
      '://',
      this.custom_hostname,
      this.custom_port,
      this.custom_path
    ].join('');
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
      "[CHAT_ADAPTER].api_key": {
        name: 'API Key',
        type: "text",
        description: "Enter the API key for the chat model.",
      },
    };
  }
  validate_get_models_params() {
    return true;
  }
}

export class SmartChatModelCustomRequestAdapter extends SmartChatModelRequestAdapter {
  get model() {
    return this.adapter.model_config.model_name;
  }
}
