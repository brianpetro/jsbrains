import { SmartHttpRequest } from "smart-http-request";
import { SmartRankModelAdapter } from "./_adapter.js";
import { SmartHttpRequestFetchAdapter } from "smart-http-request/adapters/fetch.js";

/**
 * Base API adapter class for SmartRankModel.
 * Handles HTTP requests and response processing for remote ranking services.
 * @abstract
 * @class SmartRankModelApiAdapter
 * @extends SmartRankModelAdapter
 */
export class SmartRankModelApiAdapter extends SmartRankModelAdapter {
  
  /**
   * Get the request adapter class.
   * @returns {SmartRankModelRequestAdapter} The request adapter class
   */
  get req_adapter() {
    return SmartRankModelRequestAdapter;
  }

  /**
   * Get the response adapter class.
   * @returns {SmartRankModelResponseAdapter} The response adapter class
   */
  get res_adapter() {
    return SmartRankModelResponseAdapter;
  }

  /** @returns {string} API endpoint URL */
  get endpoint() {
    return this.model_config.endpoint;
  }

  /**
   * Get HTTP request adapter instance
   * @returns {SmartHttpRequest} HTTP request handler
   */
  get http_adapter() {
    if (!this._http_adapter) {
      if (this.model.opts.http_adapter)
        this._http_adapter = this.model.opts.http_adapter;
      else
        this._http_adapter = new SmartHttpRequest({
          adapter: SmartHttpRequestFetchAdapter,
        });
    }
    return this._http_adapter;
  }

  /**
   * Get API key for authentication
   * @returns {string} API key
   */
  get api_key() {
    return this.settings.api_key || this.model_config.api_key;
  }

  /**
   * Make an API request with retry logic
   * @param {Object} req - Request configuration
   * @param {number} [retries=0] - Number of retries attempted
   * @returns {Promise<Object>} API response
   */
  async request(req, retries = 0) {
    try {
      req.throw = false;
      const resp = await this.http_adapter.request({
        url: this.endpoint,
        ...req,
      });
      const resp_json = await this.get_resp_json(resp);
      if (this.is_error(resp_json)) {
        return await this.handle_request_err(resp_json, req, retries);
      }
      return resp_json;
    } catch (error) {
      return await this.handle_request_err(error, req, retries);
    }
  }

  /**
   * Handle API request errors with retry logic
   * @param {Error|Object} error - Error object
   * @param {Object} req - Original request
   * @param {number} retries - Number of retries attempted
   * @returns {Promise<Object|null>} Retry response or null
   */
  async handle_request_err(error, req, retries) {
    if (error.status === 429 && retries < 3) {
      const backoff = Math.pow(retries + 1, 2);
      console.log(`Retrying request (429) in ${backoff} seconds...`);
      await new Promise((r) => setTimeout(r, 1000 * backoff));
      return await this.request(req, retries + 1);
    }
    console.error(error);
    return null;
  }

  /**
   * Parse response body as JSON
   * @param {Response} resp - Response object
   * @returns {Promise<Object>} Parsed JSON
   */
  async get_resp_json(resp) {
    return typeof resp.json === "function" ? await resp.json() : await resp.json;
  }

  /**
   * Validate API key by making a test request
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validate_api_key() {
    const resp = await this.rank("test query", ["Test document 1", "Test document 2"]);
    return Array.isArray(resp) && resp.length > 0 && resp[0].score !== null;
  }
}

/**
 * Base class for request adapters to handle various input schemas and convert them to platform-specific schema.
 * @class SmartRankModelRequestAdapter
 */
export class SmartRankModelRequestAdapter {
  /**
   * @constructor
   * @param {SmartRankModelApiAdapter} adapter - The SmartRankModelApiAdapter instance
   * @param {string} query - The query string
   * @param {Array<string>} documents - Array of document strings
   */
  constructor(adapter, query, documents) {
    this.adapter = adapter;
    this.query = query;
    this.documents = documents;
  }

  /**
   * Get request headers
   * @returns {Object} Headers object
   */
  get_headers() {
    return {
      "Content-Type": "application/json",
      ...(this.adapter.adapter_config.headers || {}),
      "Authorization": `Bearer ${this.adapter.api_key}`,
    };
  }

  /**
   * Convert request to platform-specific format
   * @returns {Object} Platform-specific request parameters
   */
  to_platform() {
    return {
      method: "POST",
      headers: this.get_headers(),
      body: JSON.stringify(this.prepare_request_body()),
    };
  }

  /**
   * Prepare request body for API call
   * @abstract
   * @returns {Object} Request body object
   */
  prepare_request_body() {
    throw new Error("prepare_request_body not implemented");
  }
}

/**
 * Base class for response adapters to handle various output schemas and convert them to standard schema.
 * @class SmartRankModelResponseAdapter
 */
export class SmartRankModelResponseAdapter {
  /**
   * @constructor
   * @param {SmartRankModelApiAdapter} adapter - The SmartRankModelApiAdapter instance
   * @param {Object} response - The response object
   */
  constructor(adapter, response) {
    this.adapter = adapter;
    this.response = response;
  }

  /**
   * Convert response to standard format
   * @returns {Array<Object>} Array of ranking results
   */
  to_standard() {
    return this.parse_response();
  }

  /**
   * Parse API response
   * @abstract
   * @returns {Array<Object>} Parsed ranking results
   */
  parse_response() {
    throw new Error("parse_response not implemented");
  }
}

