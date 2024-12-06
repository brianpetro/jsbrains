import { SmartRankModelApiAdapter, SmartRankModelRequestAdapter, SmartRankModelResponseAdapter } from './_api.js';

/**
 * Adapter for Cohere's ranking API.
 * Handles API communication and response processing for Cohere models.
 * @class SmartRankCohereAdapter
 * @extends SmartRankModelApiAdapter
 */
export class SmartRankCohereAdapter extends SmartRankModelApiAdapter {
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
    // Implement any initialization if necessary
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
      model: "rerank-english-v2.0",
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
      index: result.document_index,
      score: result.score,
    }));
  }
}
