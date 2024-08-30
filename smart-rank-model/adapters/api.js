import { SmartRankAdapter } from "./_adapter.js";

/**
 * ApiAdapter is the base class for all API adapters.
 * It provides the basic functionality for making requests to the API.
 * Implements OpenAI API.
 * @extends SmartRankAdapter
 * Requires model_config.request_adapter to be set.
 */
export class SmartRankApiAdapter extends SmartRankAdapter {
  /**
   * Checks if the response JSON indicates an error.
   * @param {object} resp_json - The response JSON to check.
   * @returns {boolean} True if there is an error, false otherwise.
   */
  is_error(resp_json) { return resp_json.error || resp_json.errors; }

  /**
   * Retrieves the JSON from the response.
   * @param {Response} resp - The response object.
   * @returns {Promise<object>} The response JSON.
   */
  async get_resp_json(resp) { return (typeof resp.json === 'function') ? await resp.json() : await resp.json; }

  /**
   * Handles the request, including retries for specific errors.
   * @param {object} req - The request object.
   * @param {number} retries - The current retry count.
   * @returns {Promise<object|null>} The response JSON or null if an error occurs.
   */
  async request(req, retries = 0){
    try {
      req.throw = false;
      // handle fallback to fetch (allows for overwriting in child classes)
      const resp = this.request_adapter ? await this.request_adapter({url: this.endpoint, ...req}) : await fetch(this.endpoint, req);
      const resp_json = await this.get_resp_json(resp);
      // console.log(resp_json);
      if(this.is_error(resp_json)) return await this.handle_request_err(resp_json, req, retries);
      return resp_json;
    } catch (error) {
      return await this.handle_request_err(error, req, retries);
    }
  }
  handle_request_err(error, req, retries){
    console.log(error);
    return null;
  }
  async rank(query, documents){ /* OVERRIDE */ }
}
exports.ApiAdapter = SmartRankApiAdapter;

