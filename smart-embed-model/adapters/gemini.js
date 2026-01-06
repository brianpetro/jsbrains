import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "./_api.js";

/**
 * Adapter for Google Gemini's embedding API
 * Handles token counting and API communication for Gemini models
 * @extends SmartEmbedModelApiAdapter
 */
export class GeminiEmbedModelAdapter extends SmartEmbedModelApiAdapter {
  static defaults = {
    adapter: 'gemini',
    description: 'Google Gemini (API)',
    default_model: 'gemini-embedding-001',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents',
    dims: 768,
    max_tokens: 2048,
    batch_size: 50,
  };

  /**
   * Count tokens in input text using tokenizer
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
   * @returns {SmartEmbedGeminiRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartEmbedGeminiRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {SmartEmbedGeminiResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartEmbedGeminiResponseAdapter;
  }

  /** @returns {Object} Settings configuration for Gemini adapter */
  get settings_config() {
    return {
      ...super.settings_config,
      "[ADAPTER].api_key": {
        name: "Google API Key for Gemini embeddings",
        type: "password",
        description: "Required for Gemini embedding models",
        placeholder: "Enter Google API Key",
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
      "gemini-embedding-001": {
        "id": "gemini-embedding-001",
        "batch_size": 50,
        "dims": 768,
        "max_tokens": 2048,
        "name": "Gemini Embedding",
        "description": "API, 2,048 tokens, 768 dim",
        "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
        "adapter": "gemini"
      },
    };
  }

  prepare_request_headers() {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": this.api_key
    };
  }
  
  backoff_wait_time = 5000; // initial backoff wait time in ms
  backoff_factor = 1;
  // no usaqge stats from LM Studio so need to estimate tokens
  async embed_batch(inputs, retries = 0) {
    if(smart_env.smart_sources.entities_vector_adapter.is_queue_halted) {
      throw new Error("Embedding queue halted during backoff wait due to rate limit errors.");
    }
    const token_cts = inputs.map((item) => this.estimate_tokens(item.embed_input));
    const resp = await super.embed_batch(inputs);
    if(resp[0].error && resp[0].error.details && resp[0].error.details.code === 429){
      console.warn("Rate limit error detected in Gemini embed_batch response.", resp);
      if(retries > 3){
        console.error("Max retries reached for rate limit errors.");
        throw new Error("Max retries reached for rate limit errors.");
      }
      console.warn(resp[0].error.message);
      // get prescribed wait time from resp[0].error.details.details[{retryDelay}]
      // convert Ns to ms
      const retry_detail = resp[0].error.details?.details?.find(d => d.retryDelay);
      if(retry_detail.retryDelay){
        const wait_time_ms = parseInt(retry_detail.retryDelay) * 1000 * 2; // convert to ms and double it for buffer
        console.warn(`Using server-specified retry delay of ${wait_time_ms} ms`);
        await new Promise((resolve) => setTimeout(resolve, wait_time_ms));
        return await this.embed_batch(inputs, retries + 1);
      }else{
        // FALLBACK to generic backoff if no retryDelay provided
        this.backoff_factor += 1;
        console.warn(`Rate limit exceeded, backing off for ${this.backoff_wait_time * this.backoff_factor} ms`);
        // backoff and retry from rate limit errors
        await new Promise((resolve) => setTimeout(resolve, this.backoff_wait_time * this.backoff_factor));
        return await this.embed_batch(inputs, retries + 1);
      }
    } else if (resp[0].error) {
      console.error("Error in Gemini embed_batch response:", resp[0].error);
      throw new Error(`Gemini embed_batch error: ${resp[0].error.message}`);
    }
    resp.forEach((item, idx) => { item.tokens = token_cts[idx] });
    console.log("Gemini embed_batch response:", resp);
    return resp;
  }
}

/**
 * Request adapter for Gemini embedding API
 * @class SmartEmbedGeminiRequestAdapter
 * @extends SmartEmbedModelRequestAdapter
 */
class SmartEmbedGeminiRequestAdapter extends SmartEmbedModelRequestAdapter {
  get model_id() {
    let model_id = this.adapter.model.data.model_key;
    return `models/${model_id}`;
  }
  /**
   * Prepare request body for Gemini API
   * @returns {Object} Request body for API
   */
  prepare_request_body() {
    const requests = this.embed_inputs.map(input => {
      const [title, ...content] = input.split("\n");
      const doc_content = content.join("\n").trim() || "";
      if (doc_content.length) {
        return {
          model: this.model_id,
          content: {
            parts: [{text: doc_content}]
          },
          outputDimensionality: this.model_dims,
          taskType: "RETRIEVAL_DOCUMENT",
          title: title,
        }
      }else{
        return {
          model: this.model_id,
          content: {
            parts: [{text: title}]
          },
          outputDimensionality: this.model_dims,
          taskType: "RETRIEVAL_DOCUMENT",
        }
      }
    });

    // console.log("Prepared Gemini embedding requests:", requests);
    return {
      requests,
    };
  }

}

/**
 * Response adapter for Gemini embedding API
 * @class SmartEmbedGeminiResponseAdapter
 * @extends SmartEmbedModelResponseAdapter
 */
class SmartEmbedGeminiResponseAdapter extends SmartEmbedModelResponseAdapter {
  /**
   * Parse Gemini API response
   * @returns {Array<Object>} Parsed embedding results
   */
  parse_response() {
    const resp = this.response;
    console.log("Gemini response:", resp);

    if (!resp || !resp.embeddings || !resp.embeddings[0].values) {
      console.error("Invalid Gemini embedding response format", resp);
      return [];
    }

    return resp.embeddings.map((embedding, i) => {
      if (!embedding.values || embedding.values.length === 0) {
        console.warn(`No values for embedding at index ${i}`);
        return { vec: [], tokens: 0 };
      }
      return {
        vec: embedding.values,
        tokens: null, // not provided
      };
    });

  }
}