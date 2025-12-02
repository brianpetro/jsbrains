import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "./_api.js";

/**
 * Adapter for OpenAI's embedding API
 * Handles token counting and API communication for OpenAI models
 * @extends SmartEmbedModelApiAdapter
 */
export class SmartEmbedOpenAIAdapter extends SmartEmbedModelApiAdapter {
  static defaults = {
    adapter: 'openai',
    description: 'OpenAI (API)',
    default_model: 'text-embedding-3-small',
    endpoint: 'https://api.openai.com/v1/embeddings',
  };

  /**
   * Count tokens in input text using OpenAI's tokenizer
   * @param {string} input - Text to tokenize
   * @returns {Promise<Object>} Token count result
   */
  async count_tokens(input) {
    if (!this.tiktoken) await this.load_tiktoken();
    return { tokens: this.tiktoken.encode(input).length };
  }

  /**
   * Prepare input text for embedding
   * Handles token limit truncation
   * @param {string} embed_input - Raw input text
   * @returns {Promise<string|null>} Processed input text
   */
  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== "string") {
      throw new TypeError("embed_input must be a string");
    }

    if (embed_input.length === 0) {
      console.log("Warning: prepare_embed_input received an empty string");
      return null;
    }

    const { tokens } = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) {
      return embed_input;
    }

    return await this.trim_input_to_max_tokens(embed_input, tokens);
  }

  /**
   * Trim input text to fit token limit
   * @private
   * @param {string} embed_input - Input text to trim
   * @param {number} tokens_ct - Current token count
   * @returns {Promise<string|null>} Trimmed input text
   */
  async trim_input_to_max_tokens(embed_input, tokens_ct) {
    const reduce_ratio = (tokens_ct - this.max_tokens) / tokens_ct;
    const new_length = Math.floor(embed_input.length * (1 - reduce_ratio));
    let trimmed_input = embed_input.slice(0, new_length);
    const last_space_index = trimmed_input.lastIndexOf(" ");
    if (last_space_index > 0) {
      trimmed_input = trimmed_input.slice(0, last_space_index);
    }
    const prepared_input = await this.prepare_embed_input(trimmed_input);
    if (prepared_input === null) {
      console.log(
        "Warning: prepare_embed_input resulted in an empty string after trimming"
      );
      return null;
    }
    return prepared_input;
  }

  /**
   * Get the request adapter class.
   * @returns {SmartEmbedOpenAIRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartEmbedOpenAIRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {SmartEmbedOpenAIResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartEmbedOpenAIResponseAdapter;
  }

  /** @returns {number} Maximum tokens per input */
  get max_tokens() {
    return this.model.data.max_tokens || 8191;
  }

  /** @returns {Object} Settings configuration for OpenAI adapter */
  get settings_config() {
    return {
      ...super.settings_config,
      "[ADAPTER].api_key": {
        name: "OpenAI API key for embeddings",
        type: "password",
        description: "Required for OpenAI embedding models.",
        placeholder: "Enter OpenAI API key",
      },
    };
  }
  /**
   * Get available models (hardcoded list)
   * @returns {Promise<Object>} Map of model objects
   */
  get_models() {
    return Promise.resolve(this.models);
  }
  get models() {
    return {
      "text-embedding-3-small": {
        "id": "text-embedding-3-small",
        "batch_size": 50,
        "dims": 1536,
        "max_tokens": 8191,
        "name": "OpenAI Text-3 Small",
        "description": "API, 8,191 tokens, 1,536 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
      "text-embedding-3-large": {
        "id": "text-embedding-3-large",
        "batch_size": 50,
        "dims": 3072,
        "max_tokens": 8191,
        "name": "OpenAI Text-3 Large",
        "description": "API, 8,191 tokens, 3,072 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
      // "text-embedding-3-small-512": {
      //   "id": "text-embedding-3-small",
      //   "batch_size": 50,
      //   "dims": 512,
      //   "max_tokens": 8191,
      //   "name": "OpenAI Text-3 Small - 512",
      //   "description": "API, 8,191 tokens, 512 dim",
      //   "endpoint": "https://api.openai.com/v1/embeddings",
      //   "adapter": "openai"
      // },
      // "text-embedding-3-large-256": {
      //   "id": "text-embedding-3-large",
      //   "batch_size": 50,
      //   "dims": 256,
      //   "max_tokens": 8191,
      //   "name": "OpenAI Text-3 Large - 256",
      //   "description": "API, 8,191 tokens, 256 dim",
      //   "endpoint": "https://api.openai.com/v1/embeddings",
      //   "adapter": "openai"
      // },
      "text-embedding-ada-002": {
        "id": "text-embedding-ada-002",
        "batch_size": 50,
        "dims": 1536,
        "max_tokens": 8191,
        "name": "OpenAI Ada",
        "description": "API, 8,191 tokens, 1,536 dim",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "adapter": "openai"
      },
    };
  }
}

/**
 * Request adapter for OpenAI embedding API
 * @class SmartEmbedOpenAIRequestAdapter
 * @extends SmartEmbedModelRequestAdapter
 */
class SmartEmbedOpenAIRequestAdapter extends SmartEmbedModelRequestAdapter {
  /**
   * Prepare request body for OpenAI API
   * @returns {Object} Request body for API
   */
  prepare_request_body() {
    const body = {
      model: this.model_id,
      input: this.embed_inputs,
    };
    if (this.model_id.startsWith("text-embedding-3")) {
      body.dimensions = this.model_dims;
    }
    return body;
  }
}

/**
 * Response adapter for OpenAI embedding API
 * @class SmartEmbedOpenAIResponseAdapter
 * @extends SmartEmbedModelResponseAdapter
 */
class SmartEmbedOpenAIResponseAdapter extends SmartEmbedModelResponseAdapter {
  /**
   * Parse OpenAI API response
   * @returns {Array<Object>} Parsed embedding results
   */
  parse_response() {
    const resp = this.response;
    if (!resp || !resp.data || !resp.usage) {
      console.error("Invalid response format", resp);
      return [];
    }
    const avg_tokens = resp.usage.total_tokens / resp.data.length;
    return resp.data.map((item) => ({
      vec: item.embedding,
      tokens: avg_tokens, // OpenAI doesn't provide tokens per item in batch requests
    }));
  }
}
