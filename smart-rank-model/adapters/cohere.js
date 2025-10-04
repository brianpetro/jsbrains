import {
  SmartRankModelApiAdapter,
  SmartRankModelRequestAdapter,
  SmartRankModelResponseAdapter
} from './_api.js';
import { settings_config as base_settings_config } from './_adapter.js';

/**
 * Adapter for Cohere's ranking API.
 * Handles API communication and response processing for Cohere models.
 * @class SmartRankCohereAdapter
 * @extends SmartRankModelApiAdapter
 */
export class SmartRankCohereAdapter extends SmartRankModelApiAdapter {
  static defaults = {
    adapter: 'cohere',
    description: 'Cohere',
    default_model: 'rerank-v3.5',
    endpoint: 'https://api.cohere.ai/v2/rerank'
  }
  /**
   * Get the request adapter class.
   * @returns {typeof SmartRankCohereRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartRankCohereRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {typeof SmartRankCohereResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartRankCohereResponseAdapter;
  }

  /**
   * Load the adapter
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.model.model_loaded = true;
    this.set_state('loaded');
    return;
  }

  /**
   * Rank documents using Cohere API
   * @param {string} query - The query
   * @param {Array<string>} documents - Documents to rank
   * @returns {Promise<Array<Object>>} Ranked documents
   */
  async rank(query, documents) {
    const request_adapter = new this.req_adapter(this, query, documents);
    const request_params = request_adapter.to_platform();
    const resp_json = await this.request(request_params);
    if (!resp_json || !resp_json.results) {
      return {
        message: resp_json?.message || "Invalid response from Cohere API",
        resp: resp_json,
      };
    }
    const response_adapter = new this.res_adapter(this, resp_json);
    return response_adapter.to_standard();
  }

  /**
   * Handle API request errors with specific logic for Cohere
   * @param {Error|Object} error - Error object
   * @param {Object} req - Original request
   * @param {number} retries - Number of retries attempted
   * @returns {Promise<Object|null>} Retry response or null
   */
  async handle_request_err(error, req, retries) {
    if (error && error.status === 429 && retries < 3) {
      const backoff = Math.pow(retries + 1, 2);
      console.log(`Cohere API rate limit exceeded. Retrying in ${backoff} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * backoff));
      return await this.request(req, retries + 1);
    }
    console.error("Cohere API Error:", error);
    return null;
  }
  get settings_config() {
    return settings_config;
  }
  get models() {
    return cohere_models;
  }
}
export const settings_config = {
  ...base_settings_config,
  "[ADAPTER].api_key": {
    name: 'Cohere API Key',
    type: "password",
    description: "Enter your Cohere API key for ranking.",
    placeholder: "Enter Cohere API Key",
  },
};

export const cohere_models = {
  'rerank-v3.5': {
    id: 'rerank-v3.5',
    description: 'State-of-the-art performance in English and non-English languages. Supports documents and semi-structured data (JSON). Context length: 4096 tokens'
  },
  'rerank-english-v3.0': {
    id: 'rerank-english-v3.0',
    description: 'English language documents and semi-structured data (JSON). Context length: 4096 tokens'
  },
  'rerank-multilingual-v3.0': {
    id: 'rerank-multilingual-v3.0',
    description: 'Non-English documents and semi-structured data (JSON). Supports same languages as embed-multilingual-v3.0. Context length: 4096 tokens'
  }
}

/**
 * Request adapter for Cohere ranking API.
 * @class SmartRankCohereRequestAdapter
 * @extends SmartRankModelRequestAdapter
 */
class SmartRankCohereRequestAdapter extends SmartRankModelRequestAdapter {
  /**
   * Prepare request body for Cohere API
   * @returns {Object} Request body for API
   */
  prepare_request_body() {
    return {
      query: this.query,
      documents: this.documents,
      model: this.adapter.model_key,
      top_n: 1000,
      max_tokens_per_doc: 4096
    };
  }
}

/**
 * Response adapter for Cohere ranking API.
 * @class SmartRankCohereResponseAdapter
 * @extends SmartRankModelResponseAdapter
 */
class SmartRankCohereResponseAdapter extends SmartRankModelResponseAdapter {
  /**
   * Parse Cohere API response into standard ranking results.
   * @returns {Array<Object>} Parsed ranking results
   */
  parse_response() {
    if (!this.response.results) {
      console.error("Invalid response format from Cohere API:", this.response);
      return [];
    }
    return this.response.results.map((result) => ({
      index: result.index,
      score: result.relevance_score,
    }));
  }
}
