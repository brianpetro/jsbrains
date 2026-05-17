/**
 * @typedef {Object} ContextItemData
 * @property {string} [key] - Stable context item key or referenced source key.
 * @property {number} [d] - Depth or ordering hint stored by SmartContext.
 * @property {number} [at] - Epoch milliseconds when the item was added.
 * @property {boolean} [exclude] - Whether the item is currently excluded from the active context.
 * @property {boolean|string} [folder] - Folder-derived item marker when the item was generated from a folder.
 * @property {string} [named_context] - Referenced named context key when the item expands another context.
 * @property {string|boolean} [from_named_context] - Context name marker when the item originated from a named context expansion.
 * @property {number} [size] - Cached aggregate size for the item or group.
 * @property {number|null} [mtime] - Cached modification time for the item or group.
 * @property {number} [group_items_ct] - Count of expanded child items for grouped context entries.
 */
export const ContextItemData = {};

/**
 * @typedef {Object.<string, ContextItemData>} ContextItemsData
 * @description SmartContext context_items payload keyed by item key.
 */
export const ContextItemsData = {};

/**
 * @typedef {Object} ContextImagePayload
 * @property {'image_url'} type - Media payload type discriminator.
 * @property {string} key - Context item key.
 * @property {string} name - File name used in downstream requests.
 * @property {string} url - Base64 data URL for the image.
 */
export const ContextImagePayload = {};

/**
 * @typedef {Object} ContextPdfPayload
 * @property {'pdf_url'} type - Media payload type discriminator.
 * @property {string} key - Context item key.
 * @property {string} name - File name used in downstream requests.
 * @property {string} url - Base64 data URL for the PDF.
 */
export const ContextPdfPayload = {};

/**
 * @typedef {(ContextImagePayload|ContextPdfPayload)} ContextMediaPayload
 * @description Media payload returned by SmartContext.get_media().
 */
export const ContextMediaPayload = {};

/**
 * @typedef {{error: string, [key: string]: *}} ContextErrorPayload
 * @description Error object returned by context item adapters.
 */
export const ContextErrorPayload = {};

/**
 * @typedef {(string|ContextErrorPayload|*)} ContextItemTextResult
 * @description Text or adapter-specific payload returned by ContextItem.get_text().
 */
export const ContextItemTextResult = {};

/**
 * @typedef {(ContextMediaPayload|ContextErrorPayload)} ContextItemMediaResult
 * @description Media payload or error returned by ContextItem.get_base64().
 */
export const ContextItemMediaResult = {};

/**
 * @typedef {Object} SmartContextData
 * @property {string} [key] - Stable context key.
 * @property {string} [name] - Optional user-facing context name.
 * @property {ContextItemsData} [context_items] - Context items keyed by item key.
 * @property {Object.<string, *>} [context_opts] - Legacy context options bag retained for compatibility.
 * @property {Object.<string, number>} [codeblock_inclusions] - Source keys that currently include the named context.
 */
export const SmartContextData = {};

/**
 * @typedef {Object} ContextItemsLoadParams
 * @property {string} [codeblock_source_key] - Current source key for codeblock context name-change sync.
 * @property {string[]} [named_context_stack] - Stack of named contexts used to prevent recursion.
 */
export const ContextItemsLoadParams = {};

/**
 * @typedef {Object} SmartContextAddItemParams
 * @property {boolean} [emit_updated] - Whether to emit context:updated after mutation.
 */
export const SmartContextAddItemParams = {};

/**
 * @typedef {Object} SmartContextRemoveItemParams
 * @property {boolean} [emit_updated] - Whether to emit context:updated after mutation.
 */
export const SmartContextRemoveItemParams = {};

/**
 * @typedef {Object} SmartContextMissingItemParams
 * @property {*} [debounce_ms] - Debounce window before emitting missing-item warning.
 * @property {string} [message] - Optional warning message override.
 * @property {string} [btn_text] - Optional warning action button text override.
 */
export const SmartContextMissingItemParams = {};

/**
 * @typedef {Object} ContextItemAdapterConstructor
 * @property {number} [order] - Adapter priority, lower values load first.
 * @property {function(string, ContextItemData=): (boolean|string)} detect - Detect whether the adapter supports a context item.
 */
export const ContextItemAdapterConstructor = function () {};

/**
 * @typedef {Object} ContextItemAdapterSnapshot
 * @property {string[]} [pdfs] - PDF context item keys added by the adapter.
 */
export const ContextItemAdapterSnapshot = {};
