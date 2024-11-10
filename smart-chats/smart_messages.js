import { SmartBlocks } from "smart-sources";

/**
 * @class SmartMessages
 * @extends SmartBlocks
 * @description Collection class for managing chat messages
 */
export class SmartMessages extends SmartBlocks {
  /**
   * Override for processing load queue
   * @override
   */
  process_load_queue() { }

  /**
   * Override for processing import queue
   * @override
   */
  process_import_queue() { }

  /**
   * @property {string} data_folder - Path to message storage
   * @readonly
   */
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }

  /**
   * Override for initialization
   * @override
   */
  init() { }
}
