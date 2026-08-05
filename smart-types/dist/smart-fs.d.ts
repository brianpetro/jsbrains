export type SmartFsPath = string;
/**
 * @typedef {string} SmartFsPath
 * @description Relative path handled by SmartFs.
 */
export const SmartFsPath: "";
export type SmartFsStat = {
    /**
     * - Creation time in epoch milliseconds.
     */
    ctime: number;
    /**
     * - Modification time in epoch milliseconds.
     */
    mtime: number;
    /**
     * - Size in bytes.
     */
    size: number;
    /**
     * - Deferred stat lookup error when present.
     */
    error?: Error | {
        [x: string]: any;
    };
};
/**
 * @typedef {Object} SmartFsStat
 * @property {number} ctime - Creation time in epoch milliseconds.
 * @property {number} mtime - Modification time in epoch milliseconds.
 * @property {number} size - Size in bytes.
 * @property {Error|Object.<string, *>} [error] - Deferred stat lookup error when present.
 */
export const SmartFsStat: {};
export type SmartFsFileEntry = {
    /**
     * - Relative file path.
     */
    path: import("./smart-fs.js").SmartFsPath;
    /**
     * - Entry type discriminator.
     */
    type: "file";
    /**
     * - Lowercase file extension.
     */
    extension: string;
    /**
     * - File name with extension.
     */
    name: string;
    /**
     * - File name without extension.
     */
    basename: string;
    /**
     * - Lazily resolved file stats.
     */
    stat?: import("./smart-fs.js").SmartFsStat;
};
/**
 * @typedef {Object} SmartFsFileEntry
 * @property {import('./smart-fs.js').SmartFsPath} path - Relative file path.
 * @property {'file'} type - Entry type discriminator.
 * @property {string} extension - Lowercase file extension.
 * @property {string} name - File name with extension.
 * @property {string} basename - File name without extension.
 * @property {import('./smart-fs.js').SmartFsStat} [stat] - Lazily resolved file stats.
 */
export const SmartFsFileEntry: {};
export type SmartFsFolderEntry = {
    /**
     * - Relative folder path.
     */
    path: import("./smart-fs.js").SmartFsPath;
    /**
     * - Entry type discriminator.
     */
    type: "folder";
    /**
     * - Folder name.
     */
    name: string;
    /**
     * - Descendant file entries for folder adapters that expose children.
     */
    children?: Array<import("./smart-fs.js").SmartFsFileEntry>;
};
/**
 * @typedef {Object} SmartFsFolderEntry
 * @property {import('./smart-fs.js').SmartFsPath} path - Relative folder path.
 * @property {'folder'} type - Entry type discriminator.
 * @property {string} name - Folder name.
 * @property {Array<import('./smart-fs.js').SmartFsFileEntry>} [children] - Descendant file entries for folder adapters that expose children.
 */
export const SmartFsFolderEntry: {};
export type SmartFsEntry = (SmartFsFileEntry | SmartFsFolderEntry);
/**
 * @typedef {(SmartFsFileEntry|SmartFsFolderEntry)} SmartFsEntry
 * @description File-system entry returned by SmartFs list methods.
 */
export const SmartFsEntry: {};
