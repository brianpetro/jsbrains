export type ContextItemData = {
    /**
     * - Stable context item key or referenced source key.
     */
    key?: string;
    /**
     * - Explicit structural item kind.
     */
    kind?: "source" | "block" | "folder" | "named_context" | "text";
    /**
     * - Exact source or folder path without a block/subpath suffix or synthetic external prefix.
     */
    source_path?: string;
    /**
     * - Exact block, heading, view, or other source selector after the first `#`.
     */
    subpath?: string;
    /**
     * - Whether source_path resolves outside the vault.
     */
    is_external?: boolean;
    /**
     * - Depth or ordering hint stored by SmartContext.
     */
    d?: number;
    /**
     * - Epoch milliseconds when the item was added.
     */
    at?: number;
    /**
     * - `true` on durable exclusion rows stored in SmartContextData.exclusions.
     */
    exclude?: boolean;
    /**
     * - Whether an exclusion key is interpreted as a glob pattern.
     */
    glob?: boolean;
    /**
     * - `true` for a folder group or a legacy folder-origin marker on a derived item.
     */
    folder?: boolean | string;
    /**
     * - Folder key when the item originated from folder expansion.
     */
    from_folder?: string;
    /**
     * - Referenced named context key or marker when the item expands another context.
     */
    named_context?: string | boolean;
    /**
     * - Context name marker when the item originated from a named context expansion.
     */
    from_named_context?: string | boolean;
    /**
     * - Cached aggregate size for the item or group.
     */
    size?: number;
    /**
     * - Cached modification time for the item or group.
     */
    mtime?: number | null;
    /**
     * - Count of expanded child items for grouped context entries.
     */
    group_items_ct?: number;
};
/**
 * @typedef {Object} ContextItemData
 * @property {string} [key] - Stable context item key or referenced source key.
 * @property {'source'|'block'|'folder'|'named_context'|'text'} [kind] - Explicit structural item kind.
 * @property {string} [source_path] - Exact source or folder path without a block/subpath suffix or synthetic external prefix.
 * @property {string} [subpath] - Exact block, heading, view, or other source selector after the first `#`.
 * @property {boolean} [is_external] - Whether source_path resolves outside the vault.
 * @property {number} [d] - Depth or ordering hint stored by SmartContext.
 * @property {number} [at] - Epoch milliseconds when the item was added.
 * @property {boolean} [exclude] - `true` on durable exclusion rows stored in SmartContextData.exclusions.
 * @property {boolean} [glob] - Whether an exclusion key is interpreted as a glob pattern.
 * @property {boolean|string} [folder] - `true` for a folder group or a legacy folder-origin marker on a derived item.
 * @property {string} [from_folder] - Folder key when the item originated from folder expansion.
 * @property {string|boolean} [named_context] - Referenced named context key or marker when the item expands another context.
 * @property {string|boolean} [from_named_context] - Context name marker when the item originated from a named context expansion.
 * @property {number} [size] - Cached aggregate size for the item or group.
 * @property {number|null} [mtime] - Cached modification time for the item or group.
 * @property {number} [group_items_ct] - Count of expanded child items for grouped context entries.
 */
export const ContextItemData: {};
export type ContextItemsData = {
    [x: string]: ContextItemData;
};
/**
 * @typedef {Object.<string, ContextItemData>} ContextItemsData
 * @description SmartContext context_items payload keyed by item key.
 */
export const ContextItemsData: {};
export type ContextImagePayload = {
    /**
     * - Media payload type discriminator.
     */
    type: "image_url";
    /**
     * - Context item key.
     */
    key: string;
    /**
     * - File name used in downstream requests.
     */
    name: string;
    /**
     * - Base64 data URL for the image.
     */
    url: string;
};
/**
 * @typedef {Object} ContextImagePayload
 * @property {'image_url'} type - Media payload type discriminator.
 * @property {string} key - Context item key.
 * @property {string} name - File name used in downstream requests.
 * @property {string} url - Base64 data URL for the image.
 */
export const ContextImagePayload: {};
export type ContextPdfPayload = {
    /**
     * - Media payload type discriminator.
     */
    type: "pdf_url";
    /**
     * - Context item key.
     */
    key: string;
    /**
     * - File name used in downstream requests.
     */
    name: string;
    /**
     * - Base64 data URL for the PDF.
     */
    url: string;
};
/**
 * @typedef {Object} ContextPdfPayload
 * @property {'pdf_url'} type - Media payload type discriminator.
 * @property {string} key - Context item key.
 * @property {string} name - File name used in downstream requests.
 * @property {string} url - Base64 data URL for the PDF.
 */
export const ContextPdfPayload: {};
export type ContextMediaPayload = (ContextImagePayload | ContextPdfPayload);
/**
 * @typedef {(ContextImagePayload|ContextPdfPayload)} ContextMediaPayload
 * @description Media payload returned by SmartContext.get_media().
 */
export const ContextMediaPayload: {};
export type ContextErrorPayload = {
    error: string;
    [key: string]: unknown;
};
/**
 * @typedef {{error: string, [key: string]: unknown}} ContextErrorPayload
 * @description Error object returned by context item adapters.
 */
export const ContextErrorPayload: {};
export type ContextItemTextResult = (string | ContextErrorPayload | {
    [x: string]: unknown;
});
/**
 * @typedef {(string|ContextErrorPayload|Object.<string, unknown>)} ContextItemTextResult
 * @description Text or adapter-specific payload returned by ContextItem.get_text().
 */
export const ContextItemTextResult: {};
export type ContextItemMediaResult = (ContextMediaPayload | ContextErrorPayload);
/**
 * @typedef {(ContextMediaPayload|ContextErrorPayload)} ContextItemMediaResult
 * @description Media payload or error returned by ContextItem.get_base64().
 */
export const ContextItemMediaResult: {};
export type SmartContextData = {
    /**
     * - Stable context key.
     */
    key?: string;
    /**
     * - Optional user-facing context name.
     */
    name?: string;
    /**
     * - Included context items and dynamic inclusion rules keyed by item key.
     */
    context_items?: ContextItemsData;
    /**
     * - Durable source exclusions keyed by exact source or glob identity.
     */
    exclusions?: ContextItemsData;
    /**
     * - Legacy context options bag retained for compatibility.
     */
    context_opts?: {
        [x: string]: unknown;
    };
    /**
     * - Instance settings keyed by collection; values override plugin settings.
     */
    settings?: {
        [x: string]: {
            [x: string]: unknown;
        };
    };
    /**
     * - Source keys that currently include the named context.
     */
    codeblock_inclusions?: {
        [x: string]: number;
    };
};
/**
 * @typedef {Object} SmartContextData
 * @property {string} [key] - Stable context key.
 * @property {string} [name] - Optional user-facing context name.
 * @property {ContextItemsData} [context_items] - Included context items and dynamic inclusion rules keyed by item key.
 * @property {ContextItemsData} [exclusions] - Durable source exclusions keyed by exact source or glob identity.
 * @property {Object.<string, unknown>} [context_opts] - Legacy context options bag retained for compatibility.
 * @property {Object.<string, Object.<string, unknown>>} [settings] - Instance settings keyed by collection; values override plugin settings.
 * @property {Object.<string, number>} [codeblock_inclusions] - Source keys that currently include the named context.
 */
export const SmartContextData: {};
export type ContextItemsLoadParams = {
    /**
     * - Current source key for codeblock context name-change sync.
     */
    codeblock_source_key?: string;
    /**
     * - Stack of named contexts used to prevent recursion.
     */
    named_context_stack?: string[];
};
/**
 * @typedef {Object} ContextItemsLoadParams
 * @property {string} [codeblock_source_key] - Current source key for codeblock context name-change sync.
 * @property {string[]} [named_context_stack] - Stack of named contexts used to prevent recursion.
 */
export const ContextItemsLoadParams: {};
export type SmartContextAddItemParams = {
    /**
     * - Whether to emit context:updated after mutation.
     */
    emit_updated?: boolean;
};
/**
 * @typedef {Object} SmartContextAddItemParams
 * @property {boolean} [emit_updated] - Whether to emit context:updated after mutation.
 */
export const SmartContextAddItemParams: {};
export type SmartContextRemoveItemParams = {
    /**
     * - Whether to emit context:updated after mutation.
     */
    emit_updated?: boolean;
};
/**
 * @typedef {Object} SmartContextRemoveItemParams
 * @property {boolean} [emit_updated] - Whether to emit context:updated after mutation.
 */
export const SmartContextRemoveItemParams: {};
export type SmartContextMissingItemParams = {
    /**
     * - Debounce window before emitting missing-item warning.
     */
    debounce_ms?: number;
    /**
     * - Optional warning message override.
     */
    message?: string;
    /**
     * - Optional warning action button text override.
     */
    btn_text?: string;
};
/**
 * @typedef {Object} SmartContextMissingItemParams
 * @property {number} [debounce_ms] - Debounce window before emitting missing-item warning.
 * @property {string} [message] - Optional warning message override.
 * @property {string} [btn_text] - Optional warning action button text override.
 */
export const SmartContextMissingItemParams: {};
export type ContextItemAdapterConstructor = {
    /**
     * - Adapter priority, lower values load first.
     */
    order?: number;
    /**
     * - Detect whether the adapter supports a context item.
     */
    detect: (arg0: string, arg1: ContextItemData | undefined) => (boolean | string);
};
export function ContextItemAdapterConstructor(): void;
export type ContextItemAdapterSnapshot = {
    /**
     * - PDF context item keys added by the adapter.
     */
    pdfs?: string[];
};
/**
 * @typedef {Object} ContextItemAdapterSnapshot
 * @property {string[]} [pdfs] - PDF context item keys added by the adapter.
 */
export const ContextItemAdapterSnapshot: {};
