/**
 * @typedef {string} SmartFsPath
 * @description Relative path handled by SmartFs.
 */
export const SmartFsPath = '';

/**
 * @typedef {Object} SmartFsStat
 * @property {number} ctime - Creation time in epoch milliseconds.
 * @property {number} mtime - Modification time in epoch milliseconds.
 * @property {number} size - Size in bytes.
 * @property {Error|Object.<string, *>} [error] - Deferred stat lookup error when present.
 */
export const SmartFsStat = {};

/**
 * @typedef {Object} SmartFsFileEntry
 * @property {import('./smart-fs.js').SmartFsPath} path - Relative file path.
 * @property {'file'} type - Entry type discriminator.
 * @property {string} extension - Lowercase file extension.
 * @property {string} name - File name with extension.
 * @property {string} basename - File name without extension.
 * @property {import('./smart-fs.js').SmartFsStat} [stat] - Lazily resolved file stats.
 */
export const SmartFsFileEntry = {};

/**
 * @typedef {Object} SmartFsFolderEntry
 * @property {import('./smart-fs.js').SmartFsPath} path - Relative folder path.
 * @property {'folder'} type - Entry type discriminator.
 * @property {string} name - Folder name.
 * @property {Array<import('./smart-fs.js').SmartFsFileEntry>} [children] - Descendant file entries for folder adapters that expose children.
 */
export const SmartFsFolderEntry = {};

/**
 * @typedef {(SmartFsFileEntry|SmartFsFolderEntry)} SmartFsEntry
 * @description File-system entry returned by SmartFs list methods.
 */
export const SmartFsEntry = {};
