export type SmartHttpRequestOptions = {
    /**
     * - Request adapter constructor.
     */
    adapter: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Obsidian requestUrl-compatible adapter.
     */
    obsidian_request_adapter?: any;
};
/**
 * @typedef {Object} SmartHttpRequestOptions
 * @property {import('./smart-environment.js').SmartEnvClass} adapter - Request adapter constructor.
 * @property {*} [obsidian_request_adapter] - Obsidian requestUrl-compatible adapter.
 */
export const SmartHttpRequestOptions: {};
export type SmartHttpRequestParams = {
    /**
     * - Request URL.
     */
    url: string;
    /**
     * - HTTP method, defaulting to GET in adapters when omitted.
     */
    method?: string;
    /**
     * - Request headers.
     */
    headers?: {
        [x: string]: string;
    };
    /**
     * - Request body.
     */
    body?: any;
    /**
     * - Whether the transport should throw for non-2xx responses.
     */
    throw?: boolean;
};
/**
 * @typedef {Object} SmartHttpRequestParams
 * @property {string} url - Request URL.
 * @property {string} [method] - HTTP method, defaulting to GET in adapters when omitted.
 * @property {Object.<string, string>} [headers] - Request headers.
 * @property {*} [body] - Request body.
 * @property {boolean} [throw] - Whether the transport should throw for non-2xx responses.
 */
export const SmartHttpRequestParams: {};
export type SmartHttpResponseAdapterLike = {
    /**
     * - Returns response headers.
     */
    headers: () => Promise<any> | any;
    /**
     * - Returns parsed JSON body.
     */
    json: () => Promise<any> | any;
    /**
     * - Returns HTTP status code.
     */
    status: () => Promise<number> | number;
    /**
     * - Returns raw text body.
     */
    text: () => Promise<string> | string;
};
/**
 * @typedef {Object} SmartHttpResponseAdapterLike
 * @property {function(): Promise<Object>|Object} headers - Returns response headers.
 * @property {function(): Promise<*>|*} json - Returns parsed JSON body.
 * @property {function(): Promise<number>|number} status - Returns HTTP status code.
 * @property {function(): Promise<string>|string} text - Returns raw text body.
 */
export const SmartHttpResponseAdapterLike: {};
export type SmartHttpFetchResponse = {
    /**
     * - Response headers.
     */
    headers: Headers | {
        [x: string]: string;
    };
    /**
     * - HTTP status code.
     */
    status: number;
    /**
     * - JSON body parser.
     */
    json: () => Promise<any>;
    /**
     * - Text body parser.
     */
    text: () => Promise<string>;
};
/**
 * @typedef {Object} SmartHttpFetchResponse
 * @property {Headers|Object.<string, string>} headers - Response headers.
 * @property {number} status - HTTP status code.
 * @property {function(): Promise<*>} json - JSON body parser.
 * @property {function(): Promise<string>} text - Text body parser.
 */
export const SmartHttpFetchResponse: {};
