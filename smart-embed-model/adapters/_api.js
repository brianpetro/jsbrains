import { SmartEmbedAdapter } from "./_adapter.js";
import { SmartHttpRequest } from "smart-http-request";
import { SmartHttpRequestFetchAdapter } from "smart-http-request/adapters/fetch.js";
/**
 * Base adapter class for API-based embedding models
 * @extends SmartEmbedAdapter
 */
export class SmartEmbedModelApiAdapter extends SmartEmbedAdapter {

  get endpoint() { return this.model_config.endpoint; }

  /**
   * Get HTTP request adapter
   * @returns {SmartHttpRequest} HTTP request handler
   */
  get http_adapter() {
    if (!this._http_adapter) {
      if (this.model.opts.http_adapter) this._http_adapter = this.model.opts.http_adapter;
      else this._http_adapter = new SmartHttpRequest({ adapter: SmartHttpRequestFetchAdapter });
    }
    return this._http_adapter;
  }

  /**
   * Get API key for authentication
   * Probably should be overridden by subclasses
   * @returns {string} API key
   */
  get api_key() {
    return this.settings.api_key || this.model_config.api_key;
  }

  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) {
    throw new Error("count_tokens not implemented");
  }

  /**
   * Estimate token count for input
   * @param {string|Object} input - Input to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimate_tokens(input) {
    if (typeof input === 'object') input = JSON.stringify(input);
    return Math.ceil(input.length / 3.7);
  }

  /**
   * Process a batch of inputs for embedding
   * @param {Array<Object>} inputs - Array of input objects
   * @returns {Promise<Array<Object>>} Processed inputs with embeddings
   */
  async embed_batch(inputs) {
    if(!this.api_key) throw new Error("API key not set");
    inputs = inputs.filter(item => item.embed_input?.length > 0);
    if (inputs.length === 0) {
      console.log("empty batch (or all items have empty embed_input)");
      return [];
    }
    const embed_inputs = await Promise.all(inputs.map(item => this.prepare_embed_input(item.embed_input)));
    const embeddings = await this.request_embedding(embed_inputs);
    if (!embeddings) return console.error(inputs);
    return inputs.map((item, i) => {
      item.vec = embeddings[i].vec;
      item.tokens = embeddings[i].tokens;
      return item;
    });
  }

  async prepare_embed_input(embed_input) {
    throw new Error("prepare_embed_input not implemented");
  }

  prepare_batch_input(items) {
    return items.map(item => this.prepare_embed_input(item.embed_input));
  }

  prepare_request_body(embed_input) {
    throw new Error("prepare_request_body not implemented");
  }

  prepare_request_headers() {
    let headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.api_key}`
    };
    if (this.smart_embed.opts.headers) {
      headers = { ...headers, ...this.smart_embed.opts.headers };
    }
    return headers;
  }

  async request_embedding(embed_input) {
    embed_input = embed_input.filter(input => input !== null && input.length > 0);
    if (embed_input.length === 0) {
      console.log("embed_input is empty after filtering null and empty strings");
      return null;
    }
    const request = {
      url: this.endpoint,
      method: "POST",
      body: JSON.stringify(this.prepare_request_body(embed_input)),
      headers: this.prepare_request_headers()
    };
    const resp = await this.request(request);
    return this.parse_response(resp);
  }

  parse_response(resp) {
    throw new Error("parse_response not implemented");
  }

  is_error(resp_json) {
    throw new Error("is_error not implemented");
  }

  async get_resp_json(resp) {
    return (typeof resp.json === 'function') ? await resp.json() : await resp.json;
  }

  /**
   * Make API request with retry logic
   * @param {Object} req - Request configuration
   * @param {number} [retries=0] - Number of retries attempted
   * @returns {Promise<Object>} API response
   */
  async request(req, retries = 0) {
    try {
      req.throw = false;
      const resp = await this.http_adapter.request({ url: this.endpoint, ...req });
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
   * Handle API request errors
   * @param {Error|Object} error - Error object
   * @param {Object} req - Original request
   * @param {number} retries - Number of retries attempted
   * @returns {Promise<Object|null>} Retry response or null
   */
  async handle_request_err(error, req, retries) {
    if (error.status === 429 && retries < 3) {
      const backoff = Math.pow(retries + 1, 2);
      console.log(`Retrying request (429) in ${backoff} seconds...`);
      await new Promise(r => setTimeout(r, 1000 * backoff));
      return await this.request(req, retries + 1);
    }
    console.error(error);
    return null;
  }

  async validate_api_key() {
    const resp = await this.embed_batch([{embed_input: "test"}]);
    return Array.isArray(resp) && resp.length > 0 && resp[0].vec !== null;
  }

}