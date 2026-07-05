/**
 * @typedef {Object} SmartHttpRequestOptions
 * @property {import('./smart-environment.js').SmartEnvClass} adapter - Request adapter constructor.
 * @property {*} [obsidian_request_adapter] - Obsidian requestUrl-compatible adapter.
 */
export const SmartHttpRequestOptions = {};

/**
 * @typedef {Object} SmartHttpRequestParams
 * @property {string} url - Request URL.
 * @property {string} [method] - HTTP method, defaulting to GET in adapters when omitted.
 * @property {Object.<string, string>} [headers] - Request headers.
 * @property {*} [body] - Request body.
 * @property {boolean} [throw] - Whether the transport should throw for non-2xx responses.
 */
export const SmartHttpRequestParams = {};

/**
 * @typedef {Object} SmartHttpResponseAdapterLike
 * @property {function(): Promise<Object>|Object} headers - Returns response headers.
 * @property {function(): Promise<*>|*} json - Returns parsed JSON body.
 * @property {function(): Promise<number>|number} status - Returns HTTP status code.
 * @property {function(): Promise<string>|string} text - Returns raw text body.
 */
export const SmartHttpResponseAdapterLike = {};

/**
 * @typedef {Object} SmartHttpFetchResponse
 * @property {Headers|Object.<string, string>} headers - Response headers.
 * @property {number} status - HTTP status code.
 * @property {function(): Promise<*>} json - JSON body parser.
 * @property {function(): Promise<string>} text - Text body parser.
 */
export const SmartHttpFetchResponse = {};
