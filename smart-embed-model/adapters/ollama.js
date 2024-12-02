// ## Generate Embeddings

// ```shell
// POST /api/embed
// ```

// Generate embeddings from a model

// ### Parameters

// - `model`: name of model to generate embeddings from
// - `input`: text or list of text to generate embeddings for

// Advanced parameters:

// - `truncate`: truncates the end of each input to fit within context length. Returns error if `false` and context length is exceeded. Defaults to `true`
// - `options`: additional model parameters listed in the documentation for the [Modelfile](./modelfile.md#valid-parameters-and-values) such as `temperature`
// - `keep_alive`: controls how long the model will stay loaded into memory following the request (default: `5m`)

// ### Examples

// #### Request

// ```shell
// curl http://localhost:11434/api/embed -d '{
//   "model": "all-minilm",
//   "input": "Why is the sky blue?"
// }'
// ```

// #### Response

// ```json
// {
//   "model": "all-minilm",
//   "embeddings": [[
//     0.010071029, -0.0017594862, 0.05007221, 0.04692972, 0.054916814,
//     0.008599704, 0.105441414, -0.025878139, 0.12958129, 0.031952348
//   ]],
//   "total_duration": 14143917,
//   "load_duration": 1019500,
//   "prompt_eval_count": 8
// }
// ```

// #### Request (Multiple input)

// ```shell
// curl http://localhost:11434/api/embed -d '{
//   "model": "all-minilm",
//   "input": ["Why is the sky blue?", "Why is the grass green?"]
// }'
// ```

// #### Response

// ```json
// {
//   "model": "all-minilm",
//   "embeddings": [[
//     0.010071029, -0.0017594862, 0.05007221, 0.04692972, 0.054916814,
//     0.008599704, 0.105441414, -0.025878139, 0.12958129, 0.031952348
//   ],[
//     -0.0098027075, 0.06042469, 0.025257962, -0.006364387, 0.07272725,
//     0.017194884, 0.09032035, -0.051705178, 0.09951512, 0.09072481
//   ]]
// }
// ```

import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "./_api.js";

/**
 * Adapter for Ollama's local embedding API.
 * Handles communication with locally running Ollama instance for generating embeddings.
 * @class SmartEmbedModelOllamaAdapter
 * @extends SmartEmbedModelApiAdapter
 */
export class SmartEmbedModelOllamaAdapter extends SmartEmbedModelApiAdapter {
  static defaults = {
    description: "Ollama (Local Embedding)",
    type: "API",
    endpoint: "http://localhost:11434/api/embed",
    models_endpoint: "http://localhost:11434/api/tags",
    api_key: 'na', // Not required for local instance
    streaming: false, // Ollama's embed API does not support streaming
    max_tokens: 8192, // Example default, adjust based on model capabilities
    signup_url: null, // Not applicable for local instance
  };

  /**
   * Get the request adapter class.
   * @returns {SmartEmbedModelOllamaRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartEmbedModelOllamaRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {SmartEmbedModelOllamaResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartEmbedModelOllamaResponseAdapter;
  }

  /**
   * Get available models from local Ollama instance.
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh = false) {
    if (
      !refresh &&
      this.adapter_config?.models &&
      typeof this.adapter_config.models === 'object' &&
      Object.keys(this.adapter_config.models).length > 0
    ) {
      return this.adapter_config.models; // Return cached models if not refreshing
    }

    try {
      console.log('Fetching models from Ollama...');
      const response = await this.http_adapter.request({
        url: this.models_endpoint,
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      const model_data = this.parse_model_data(data);
      console.log('Available models:', model_data);

      this.adapter_settings.models = model_data; // Persist models
      this.model.render_settings(); // Update settings UI

      return model_data;
    } catch (error) {
      console.error('Failed to fetch model data:', error);
      return { "_": { id: `Failed to fetch models from ${this.model.adapter_name}` } };
    }
  }

  /**
   * Parse model data from Ollama API response.
   * @param {Object} model_data - Raw model data from Ollama
   * @returns {Object} Map of model objects with capabilities and limits
   */
  parse_model_data(model_data) {
    if (!model_data || !model_data.models) {
      console.error('Invalid model data format from Ollama:', model_data);
      return {};
    }

    return model_data.models.reduce((acc, model) => {
      acc[model.name] = {
        model_name: model.name,
        id: model.name,
        multimodal: false, // Adjust if Ollama supports multimodal embeddings
        max_input_tokens: model.context_length || this.max_tokens, // Use context_length if provided
        description: model.description || `Model: ${model.name}`,
      };
      return acc;
    }, {});
  }

  /**
   * Override settings config to remove API key setting since not needed for local instance.
   * @returns {Object} Settings configuration object
   */
  get settings_config() {
    const config = super.settings_config;
    delete config['[ADAPTER].api_key'];
    return config;
  }
}

/**
 * Request adapter for Ollama embedding API.
 * Converts standard embed requests to Ollama's API format.
 * @class SmartEmbedModelOllamaRequestAdapter
 * @extends SmartEmbedModelRequestAdapter
 */
class SmartEmbedModelOllamaRequestAdapter extends SmartEmbedModelRequestAdapter {
  /**
   * Convert request to Ollama's embed API format.
   * @param {boolean} [streaming=false] - Whether streaming is enabled (not used here)
   * @returns {Object} Request parameters in Ollama's format
   */
  to_platform(streaming = false) {
    const ollama_body = {
      model: this.model,
      input: this.embed_inputs,
      // Advanced parameters can be added here if needed
      // truncate: true, // Defaults to true, adjust based on requirements
      // options: { temperature: 0.7 }, // Example option
      // keep_alive: "5m", // Example option
    };

    return {
      url: this.adapter.endpoint,
      method: 'POST',
      headers: this.get_headers(),
      body: JSON.stringify(ollama_body),
    };
  }

  /**
   * Prepare request headers for Ollama API.
   * @returns {Object} Headers object
   */
  get_headers() {
    return {
      "Content-Type": "application/json",
      // Add additional headers if required by Ollama
    };
  }
}

/**
 * Response adapter for Ollama embedding API.
 * Parses Ollama's embed API responses into a standardized format.
 * @class SmartEmbedModelOllamaResponseAdapter
 * @extends SmartEmbedModelResponseAdapter
 */
class SmartEmbedModelOllamaResponseAdapter extends SmartEmbedModelResponseAdapter {
  /**
   * Convert Ollama's response to a standardized OpenAI-like format.
   * @returns {Array<Object>} Array of embedding results
   */
  to_openai() {
    const resp = this.response;

    if (!resp || !resp.embeddings) {
      console.error("Invalid response format from Ollama:", resp);
      return [];
    }

    const embeddings = resp.embeddings.map((vec) => ({
      vec: vec,
      tokens: null, // Ollama's embed API does not provide token counts
    }));

    return embeddings;
  }

  /**
   * Parse the response object.
   * @returns {Array<Object>} Parsed embedding results
   */
  parse_response() {
    return this.to_openai();
  }
}

