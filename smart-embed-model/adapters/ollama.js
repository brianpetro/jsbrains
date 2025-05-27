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
 * @class SmartEmbedOllamaAdapter
 * @extends SmartEmbedModelApiAdapter
 */
export class SmartEmbedOllamaAdapter extends SmartEmbedModelApiAdapter {
  static defaults = {
    description: "Ollama (Local)",
    type: "API",
    endpoint: "http://localhost:11434/api/embed",
    models_endpoint: "http://localhost:11434/api/tags",
    api_key: 'na', // Not required for local instance
    streaming: false, // Ollama's embed API does not support streaming
    max_tokens: 8192, // Example default, adjust based on model capabilities
    signup_url: null, // Not applicable for local instance
    batch_size: 100,
    models: {},
  };

  /**
   * Estimate token count for input text.
   * Ollama does not expose a tokenizer so we use a character based heuristic.
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   */
  async count_tokens(input) {
    return { tokens: this.estimate_tokens(input) };
  }

  /**
   * Prepare input text and ensure it fits within `max_tokens`.
   * @param {string} embed_input - Raw input text
   * @returns {Promise<string|null>} Processed input text
   */
  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== 'string') throw new TypeError('embed_input must be a string');
    if (embed_input.length === 0) return null;

    const { tokens } = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) return embed_input;

    return await this.trim_input_to_max_tokens(embed_input, tokens);
  }

  /**
   * Trim input text to satisfy `max_tokens`.
   * @private
   * @param {string} embed_input - Input text
   * @param {number} tokens_ct - Existing token count
   * @returns {Promise<string|null>} Trimmed text
   */
  async trim_input_to_max_tokens(embed_input, tokens_ct) {
    const reduce_ratio = (tokens_ct - this.max_tokens) / tokens_ct;
    const new_length = Math.floor(embed_input.length * (1 - reduce_ratio));
    let trimmed_input = embed_input.slice(0, new_length);
    const last_space_index = trimmed_input.lastIndexOf(' ');
    if (last_space_index > 0) trimmed_input = trimmed_input.slice(0, last_space_index);
    const prepared = await this.prepare_embed_input(trimmed_input);
    if (prepared === null) return null;
    return prepared;
  }

  /** @returns {number} Maximum tokens for an input */
  get max_tokens() {
    return this.model_config.max_tokens || this.constructor.defaults.max_tokens;
  }

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
    this.models_endpoint = this.constructor.defaults.models_endpoint;
    // if (
    //   !refresh &&
    //   this.adapter_config?.models &&
    //   typeof this.adapter_config.models === 'object' &&
    //   Object.keys(this.adapter_config.models).length > 0
    // ) {
    //   return this.adapter_config.models; // return cached models if not refreshing
    // }

    try {
      const list_resp = await this.http_adapter.request({
        url: this.models_endpoint,
        method: 'GET',
      });
      if (list_resp.ok === false) {
        throw new Error(`Failed to fetch models list: ${list_resp.statusText}`);
      }
      const list_data = await list_resp.json();
      const models_raw = [];
      for (const m of filter_embedding_models(list_data.models || [])) {
        const detail_resp = await this.http_adapter.request({
          url: 'http://localhost:11434/api/show',
          method: 'POST',
          body: JSON.stringify({ model: m.name }),
        });
        models_raw.push({ ...(await detail_resp.json()), name: m.name });
      }
      console.log(models_raw);
      const model_data = this.parse_model_data(models_raw);
      // this.adapter_settings.models = model_data;
      this.model.re_render_settings();
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
    if (!Array.isArray(model_data)) {
      console.error('Invalid model data format from Ollama:', model_data);
      return {};
    }

    return model_data.reduce((acc, model) => {
      const info = model.model_info || {};
      const ctx = Object.entries(info).find(([k]) => k.includes('context_length'))?.[1];
      const dims = Object.entries(info).find(([k]) => k.includes('embedding_length'))?.[1];
      acc[model.name] = {
        model_name: model.name,
        id: model.name,
        multimodal: false,
        max_input_tokens: ctx || this.max_tokens,
        dims,
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
    console.log(this.embed_inputs.length);
    const ollama_body = {
      model: this.adapter.model_config.id,
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

    const tokens = Math.ceil(resp.prompt_eval_count / this.adapter.batch_size);
    const embeddings = resp.embeddings.map((vec) => ({
      vec: vec,
      tokens: tokens,
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

/**
 * True when a model’s name contains “embed” or “embedding”
 * as an independent segment (delimited by – or _).
 * Pure, side-effect-free.
 *
 * @param {OllamaModel} mod
 * @returns {boolean}
 */
const is_embedding_model = (mod) => {
  return /(?:^|[-_])(embed|embedding)(?:$|[-_])/.test(mod.name);
};

/**
 * Returns only embedding models.
 *
 * @param {OllamaModel[]} models
 * @returns {OllamaModel[]}
 */
export const filter_embedding_models = (models) => {
  if (!Array.isArray(models)) {
    throw new TypeError('models must be an array');
  }
  return models.filter(is_embedding_model);
};