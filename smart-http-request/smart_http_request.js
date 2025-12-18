export class SmartHttpRequest {
  /**
   * @param {object} opts - Options for the SmartHttpRequest class
   * @param {SmartHttpRequestAdapter} opts.adapter - The adapter constructor to use for making HTTP requests
   * @param {Obsidian.requestUrl} opts.obsidian_request_adapter - For use with Obsidian adapter
   */
  constructor(opts={}) {
    this.opts = opts;
    if(!opts.adapter) throw new Error("HttpRequestAdapter is required");
    this.adapter = new opts.adapter(this);
  }
  /**
   * Returns a well-formed response object
   * @param {object} request_params - Parameters for the HTTP request
   * @param {string} request_params.url - The URL to make the request to
   * @param {string} [request_params.method='GET'] - The HTTP method to use
   * @param {object} [request_params.headers] - Headers to include in the request
   * @param {*} [request_params.body] - The body of the request (for POST, PUT, etc.)
   * @returns {SmartHttpResponseAdapter} instance of the SmartHttpResponseAdapter class
   * @example
   * const response = await smart_http_request.request({
   *   url: 'https://api.example.com/data',
   *   method: 'GET',
   *   headers: { 'Content-Type': 'application/json' }
   * });
   * console.log(await response.json());
   */
  async request(request_params, throw_on_error = false) {
    return await this.adapter.request(request_params, throw_on_error);
  }
}