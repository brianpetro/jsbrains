export class SmartHttpRequestAdapter {
  constructor(main) {
    this.main = main;
  }
  /**
   * Execute an HTTP request using adapter-specific transport.
   * @abstract
   * @param {Object} request_params - Parameters for the outbound request.
   * @returns {Promise<SmartHttpResponseAdapter>} Adapter-specific response wrapper.
   */
  async request(request_params) { throw new Error("request not implemented"); }
}

export class SmartHttpResponseAdapter {
  constructor(response) {
    this.response = response;
  }
  /**
   * Retrieve response headers.
   * @abstract
   * @returns {Promise<Object>} Headers object for the response.
   */
  async headers() { throw new Error("headers not implemented"); }
  /**
   * Parse the response body as JSON.
   * @abstract
   * @returns {Promise<*>} Parsed JSON payload.
   */
  async json() { throw new Error("json not implemented"); }
  /**
   * Get the HTTP status code.
   * @abstract
   * @returns {Promise<number>} Response status code.
   */
  async status() { throw new Error("status not implemented"); }
  /**
   * Read the raw text body.
   * @abstract
   * @returns {Promise<string>} Response body as text.
   */
  async text() { throw new Error("text not implemented"); }
}