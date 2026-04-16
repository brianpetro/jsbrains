/**
 * @typedef {Object} ContextItemData
 * @property {string} [key] - Stable context item key or referenced source key.
 * @property {number} [d] - Depth or ordering hint stored by SmartContext.
 * @property {number} [at] - Epoch milliseconds when the item was added.
 * @property {boolean} [exclude] - Whether the item is currently excluded from the active context.
 * @property {boolean|string} [folder] - Folder-derived item marker when the item was generated from a folder.
 * @property {string} [named_context] - Referenced named context key when the item expands another context.
 * @property {boolean} [from_named_context] - Whether the item originated from a named context expansion.
 * @property {number} [size] - Cached aggregate size for the item or group.
 * @property {number} [mtime] - Cached modification time for the item or group.
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
 * @typedef {Object} SmartContextData
 * @property {string} [key] - Stable context key.
 * @property {string} [name] - Optional user-facing context name.
 * @property {import('./smart-contexts.js').ContextItemsData} [context_items] - Context items keyed by item key.
 * @property {Object.<string, *>} [context_opts] - Legacy context options bag retained for compatibility.
 * @property {Object.<string, number>} [codeblock_inclusions] - Source keys that currently include the named context.
 */
export const SmartContextData = {};
