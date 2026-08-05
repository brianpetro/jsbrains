export type SmartHttpRequestOptions = {
    /**
     * - Request adapter constructor.
     */
    adapter: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Obsidian requestUrl-compatible adapter.
     */
    obsidian_request_adapter?: unknown;
};
/**
 * @typedef {Object} SmartHttpRequestOptions
 * @property {import('./smart-environment.js').SmartEnvClass} adapter - Request adapter constructor.
 * @property {unknown} [obsidian_request_adapter] - Obsidian requestUrl-compatible adapter.
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
    body?: unknown;
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
 * @property {unknown} [body] - Request body.
 * @property {boolean} [throw] - Whether the transport should throw for non-2xx responses.
 */
export const SmartHttpRequestParams: {};
export type SmartHttpResponseAdapterLike = {
    /**
     * - Returns response headers.
     */
    headers: () => Promise<Record<string, unknown>> | Record<string, unknown>;
    /**
     * - Returns parsed JSON body.
     */
    json: () => Promise<unknown> | unknown;
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
 * @property {() => Promise<Record<string, unknown>>|Record<string, unknown>} headers - Returns response headers.
 * @property {() => Promise<unknown>|unknown} json - Returns parsed JSON body.
 * @property {() => Promise<number>|number} status - Returns HTTP status code.
 * @property {() => Promise<string>|string} text - Returns raw text body.
 */
export const SmartHttpResponseAdapterLike: {};
/**
 * Fetch-compatible HTTP response contract.
 */
export type SmartHttpFetchResponse<TJson = unknown> = {
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
    json: () => Promise<TJson>;
    /**
     * - Text body parser.
     */
    text: () => Promise<string>;
};
/**
 * Fetch-compatible HTTP response contract.
 *
 * @template [TJson=unknown]
 * @typedef {Object} SmartHttpFetchResponse
 * @property {Headers|Object.<string, string>} headers - Response headers.
 * @property {number} status - HTTP status code.
 * @property {() => Promise<TJson>} json - JSON body parser.
 * @property {() => Promise<string>} text - Text body parser.
 */
export const SmartHttpFetchResponse: {};
/**
 * Parsed HTTP response contract used by requestUrl-style host adapters.
 */
export type SmartHttpRequestResponse<TJson = unknown> = {
    /**
     * - Parsed JSON body.
     */
    json: TJson;
    /**
     * - Raw text body.
     */
    text: string;
    /**
     * - HTTP status code.
     */
    status?: number;
    /**
     * - Response headers.
     */
    headers?: {
        [x: string]: string;
    };
    /**
     * - Raw response body.
     */
    arrayBuffer?: ArrayBuffer;
};
/**
 * Parsed HTTP response contract used by requestUrl-style host adapters.
 *
 * @template [TJson=unknown]
 * @typedef {Object} SmartHttpRequestResponse
 * @property {TJson} json - Parsed JSON body.
 * @property {string} text - Raw text body.
 * @property {number} [status] - HTTP status code.
 * @property {Object.<string, string>} [headers] - Response headers.
 * @property {ArrayBuffer} [arrayBuffer] - Raw response body.
 */
export const SmartHttpRequestResponse: {};
