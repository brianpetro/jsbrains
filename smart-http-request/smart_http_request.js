import { SmartHttpRequestFetchAdapter } from "./adapters/fetch.js";

export class SmartHttpRequest {
  /**
   * @param {object} opts - Options for the SmartHttpRequest class
   * @param {SmartHttpRequestAdapter} opts.adapter - The adapter constructor to use for making HTTP requests
   * @param {Obsidian.requestUrl} opts.obsidian_request_adapter - For use with Obsidian adapter
   */
  constructor(opts={}) {
    this.opts = opts;
    this.adapter = opts.adapter ? new opts.adapter() : new SmartHttpRequestFetchAdapter();
  }
  /**
   * Returns a well-formed response object
   * @param {*} url 
   * @param {*} opts 
   * @returns {SmartHttpResponseAdapter} instance of the SmartHttpResponseAdapter class
   * @example
   * const response = await smart_http_request.request('https://api.example.com/data', { method: 'GET' });
   * console.log(response.data);
   */
  async request(url, opts={}) { return await this.adapter.request(url, opts); }
}