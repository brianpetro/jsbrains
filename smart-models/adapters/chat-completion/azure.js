import {
  SmartChatModelAzureAdapter,
} from "smart-chat-model/adapters/azure.js";

export class AzureChatCompletionModelAdapter extends SmartChatModelAzureAdapter {
  constructor(model_item) {
    super(model_item);
  }

  get http_adapter() {
    if (!this._http_adapter) {
      const HttpClass = this.model.env.config.modules.http_adapter.class;
      const http_params = {...this.model.env.config.modules.http_adapter, class: undefined};
      this._http_adapter = new HttpClass(http_params);
    }
    return this._http_adapter;
  }
}

const settings_config = {
  "api_key": {
    name: 'API Key',
    type: "password",
    description: "Enter your Anthropic API key.",
  },
  "azure_resource_name": {
    name: 'Azure Resource Name',
    type: "text",
    description: "The name of your Azure OpenAI resource (e.g. 'my-azure-openai').",
    default: "",
  },
  "azure_deployment_name": {
    name: 'Azure Deployment Name',
    type: "text",
    description: "The name of your specific model deployment (e.g. 'gpt35-deployment').",
    default: "",
  },
  "azure_api_version": {
    name: 'Azure API Version',
    type: "text",
    description: "The API version for Azure OpenAI (e.g. '2024-10-01-preview').",
    default: "2024-10-01-preview",
  },
};

export default {
  class: AzureChatCompletionModelAdapter,
  settings_config,
};
