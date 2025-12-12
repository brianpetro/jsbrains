import { SmartChatModelApiAdapter } from './_api.js';
import {
  SmartChatModelRequestAdapter,
  SmartChatModelResponseAdapter
} from './_api.js';
import {
  SmartChatModelAnthropicRequestAdapter,
  SmartChatModelAnthropicResponseAdapter
} from './anthropic.js';
import {
  SmartChatModelGeminiRequestAdapter,
  SmartChatModelGeminiResponseAdapter
} from './google.js';
import {
  SmartChatModelLmStudioRequestAdapter,
  SmartChatModelLmStudioResponseAdapter
} from './lm_studio.js';
import {
  SmartChatModelOllamaRequestAdapter,
  SmartChatModelOllamaResponseAdapter
} from './ollama.js';

/**
 * Simple adapter name-to-class mapping for request/response adapters.
 * Add or remove mappings here as needed.
 * @type {Object<string, {req: typeof SmartChatModelRequestAdapter, res: typeof SmartChatModelResponseAdapter}>}
 */
const adapters_map = {
  'openai': {
    req: SmartChatModelRequestAdapter,
    res: SmartChatModelResponseAdapter
  },
  'anthropic': {
    req: SmartChatModelAnthropicRequestAdapter,
    res: SmartChatModelAnthropicResponseAdapter
  },
  'gemini': {
    req: SmartChatModelGeminiRequestAdapter,
    res: SmartChatModelGeminiResponseAdapter
  },
  'lm_studio': {
    req: SmartChatModelLmStudioRequestAdapter,
    res: SmartChatModelLmStudioResponseAdapter
  },
  'ollama': {
    req: SmartChatModelOllamaRequestAdapter,
    res: SmartChatModelOllamaResponseAdapter
  }
};

/**
 * Adapter for a user-defined "Custom API", allowing dynamic selection
 * of request/response adapters via the 'api_adapter' setting.
 * @class SmartChatModelCustomAdapter
 * @extends SmartChatModelApiAdapter
 */
export class SmartChatModelCustomAdapter extends SmartChatModelApiAdapter {
  static key = "custom";
  static defaults = {
    description: 'Custom API (Local or Remote, OpenAI format)',
    type: 'API',
    /**
     * new default property: 'api_adapter' indicates which
     * request/response adapter set to use internally
     */
    api_adapter: 'openai'
  };

  /**
   * Provide dynamic request/response classes
   */

  /**
   * @override
   * @returns {typeof SmartChatModelRequestAdapter}
   */
  get req_adapter() {
    const adapter_name = this.model.data.api_adapter || 'openai';
    const map_entry = adapters_map[adapter_name];
    return (map_entry && map_entry.req) ? map_entry.req : SmartChatModelRequestAdapter;
  }

  /**
   * @override
   * @returns {typeof SmartChatModelResponseAdapter}
   */
  get res_adapter() {
    const adapter_name = this.model.data.api_adapter || 'openai';
    const map_entry = adapters_map[adapter_name];
    return (map_entry && map_entry.res) ? map_entry.res : SmartChatModelResponseAdapter;
  }

  /**
   * Synthesize a custom endpoint from the config fields.
   * All fields are optional; fallback to a minimal default.
   * @returns {string}
   */
  get endpoint() {
    const protocol = this.model.data.protocol || 'http';
    const hostname = this.model.data.hostname || 'localhost';
    const port = this.model.data.port ? `:${this.model.data.port}` : '';
    let path = this.model.data.path || '';
    if (path && !path.startsWith('/')) path = `/${path}`;
    return `${protocol}://${hostname}${port}${path}`;
  }

  get_adapters_as_options() {
    return Object.keys(adapters_map).map(adapter_name => ({ value: adapter_name, name: adapter_name }));
  }

  /**
   * Provide custom settings for configuring
   * the user-defined fields plus the new 'api_adapter'.
   * @override
   * @returns {Object} settings configuration
   */
  get settings_config() {
    return {
      /**
       * Select which specialized request/response adapter
       * you'd like to use for your custom endpoint.
       */
      '[CHAT_ADAPTER].api_adapter': {
        name: 'API Adapter',
        type: 'dropdown',
        description: 'Pick a built-in or external adapter to parse request/response data.',
        // Provide a short selection set, or dynamically gather from keys of adapters_map
        // options_callback: 'adapter.get_adapters_as_options',
        options_callback: () => { this.get_adapters_as_options() }, // UNTESTED
        default: 'openai'
      },
      '[CHAT_ADAPTER].id': {
        name: 'Model Name',
        type: 'text',
        description: 'Enter the model name for your endpoint if needed.'
      },
      '[CHAT_ADAPTER].protocol': {
        name: 'Protocol',
        type: 'text',
        description: 'e.g. http or https'
      },
      '[CHAT_ADAPTER].hostname': {
        name: 'Hostname',
        type: 'text',
        description: 'e.g. localhost or some.remote.host'
      },
      '[CHAT_ADAPTER].port': {
        name: 'Port',
        type: 'number',
        description: 'Port number or leave blank'
      },
      '[CHAT_ADAPTER].path': {
        name: 'Path',
        type: 'text',
        description: 'Path portion of the URL (leading slash optional)'
      },
      '[CHAT_ADAPTER].streaming': {
        name: 'Streaming',
        type: 'toggle',
        description: 'Enable streaming if your API supports it.'
      },
      '[CHAT_ADAPTER].max_input_tokens': {
        name: 'Max Input Tokens',
        type: 'number',
        description: 'Max number of tokens your model can handle in the prompt.'
      },
      '[CHAT_ADAPTER].api_key': {
        name: 'API Key',
        type: 'password',
        description: 'If your service requires an API key, add it here.'
      }
    };
  }

}

/**
 * Default request adapter if user chooses 'openai', but they can override
 * with other sub-adapter logic if 'api_adapter' is different.
 * @class SmartChatModelCustomRequestAdapter
 * @extends SmartChatModelRequestAdapter
 */
export class SmartChatModelCustomRequestAdapter extends SmartChatModelRequestAdapter {
}