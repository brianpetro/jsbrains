import { SmartChatModelOpenaiAdapter } from './openai.js';

/**
 * Adapter for Azure OpenAI Service.
 * Extends the OpenAI adapter with overrides for:
 *  - authentication header to "api-key"
 *  - endpoint construction from resource/deployment/API-version
 * 
 * Note: You must configure:
 *   - `azure_resource_name`
 *   - `azure_deployment_name`
 *   - `azure_api_version` (default: "2023-05-15" or your preferred GA version)
 *   - `api_key`  (the Azure OpenAI key)
 */
export class SmartChatModelAzureAdapter extends SmartChatModelOpenaiAdapter {
  static key = "azure";
  static defaults = {
    description: "Azure OpenAI",
    type: "API",
    adapter: "AzureOpenAI",
    streaming: true,
    api_key_header: "api-key",
    azure_resource_name: "",
    azure_deployment_name: "",
    azure_api_version: "2024-10-01-preview",
    default_model: "gpt-35-turbo",
    signup_url: "https://learn.microsoft.com/azure/cognitive-services/openai/quickstart?tabs=command-line",
    models_endpoint: "https://{azure_resource_name}.openai.azure.com/openai/deployments?api-version={azure_api_version}",
  };

  /**
   * Override the settings configuration to include Azure-specific fields.
   */
  get settings_config() {
    return {
      ...super.settings_config,
      "[CHAT_ADAPTER].azure_resource_name": {
        name: 'Azure Resource Name',
        type: "text",
        description: "The name of your Azure OpenAI resource (e.g. 'my-azure-openai').",
        default: "",
      },
      "[CHAT_ADAPTER].azure_deployment_name": {
        name: 'Azure Deployment Name',
        type: "text",
        description: "The name of your specific model deployment (e.g. 'gpt35-deployment').",
        default: "",
      },
      "[CHAT_ADAPTER].azure_api_version": {
        name: 'Azure API Version',
        type: "text",
        description: "The API version for Azure OpenAI (e.g. '2024-10-01-preview').",
        default: "2024-10-01-preview",
      },
    };
  }


  /**
   * Build the endpoint dynamically based on Azure settings.
   * Example:
   *  https://<RESOURCE>.openai.azure.com/openai/deployments/<DEPLOYMENT>/chat/completions?api-version=2023-05-15
   */
  get endpoint() {
    const { azure_resource_name, azure_deployment_name, azure_api_version } = this.model.data;
    return `https://${azure_resource_name}.openai.azure.com/openai/deployments/${azure_deployment_name}/chat/completions?api-version=${azure_api_version}`;
  }

  /**
   * For streaming, we can reuse the same endpoint. 
   * The request body includes `stream: true` which the base class uses.
   */
  get endpoint_streaming() {
    return this.endpoint;
  }

  /**
   * The models endpoint for retrieving a list of your deployments.
   * E.g.:
   *   https://<RESOURCE>.openai.azure.com/openai/deployments?api-version=2023-05-15
   */
  get models_endpoint() {
    const { azure_resource_name, azure_api_version } = this.model.data;
    return `https://${azure_resource_name}.openai.azure.com/openai/deployments?api-version=${azure_api_version}`;
  }

  /**
   * Azure returns a list of deployments in the shape:
   * {
   *   "object": "list",
   *   "data": [
   *     {
   *       "id": "mydeployment",
   *       "model": "gpt-35-turbo",
   *       "status": "succeeded",
   *       "createdAt": ...
   *       "updatedAt": ...
   *       ...
   *     },
   *     ...
   *   ]
   * }
   * We'll parse them into a dictionary keyed by deployment ID.
   */
  parse_model_data(model_data) {
    if (model_data.object !== 'list' || !Array.isArray(model_data.data)) {
      return {"_": { id: "No deployments found." }};
    }
    const parsed = {};
    for (const d of model_data.data) {
      parsed[d.id] = {
        model_name: d.id,
        id: d.id,
        raw: d,
        // You can add more details if you want:
        description: `Model: ${d.model}, Status: ${d.status}`,
        // Hard to guess tokens; omit or guess:
        max_input_tokens: 4000,
      };
    }
    return parsed;
  }
}
