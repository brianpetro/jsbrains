import { SmartRankModelApiAdapter, SmartRankModelRequestAdapter, SmartRankModelResponseAdapter } from './api.js';

/**
 * Adapter for Cohere's ranking API.
 * Handles API communication and response processing for Cohere models.
 * @class SmartRankCohereAdapter
 * @extends SmartRankModelApiAdapter
 */
export class SmartRankCohereAdapter extends SmartRankModelApiAdapter {
  /**
   * Get the request adapter class.
   * @returns {SmartRankCohereRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartRankCohereRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {SmartRankCohereResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartRankCohereResponseAdapter;
  }

  /** @override */
  async load() { 
    // Implement any initialization if necessary
    return true; 
  }

  /** @override */
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
   * Override the handle_request_err method for Cohere-specific error handling.
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
      model: "rerank-english-v2.0",
      query: this.query,
      documents: this.documents,
      // top_n: 3, // Optional: specify if needed
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
    return this.response.results.map((result, index) => ({
      index: result.document_index,
      score: result.score,
      // Add additional fields if necessary
    }));
  }
}