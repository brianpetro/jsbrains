import { Collection } from 'smart-collections';
import { AjsonSingleFileCollectionDataAdapter } from "smart-collections/adapters/ajson_single_file.js";
import { SmartContext } from './smart_context.js';

/**
 * @class SmartContexts
 * @extends Collection
 * @classdesc
 * Manages a collection of SmartContext items, each representing a set of references
 * or data relevant to a specific use case (e.g., building a textual context for AI).
 */
export class SmartContexts extends Collection {
  static version = 0.1;
  /**
   * new_context
   * @param {object} data
   * @param {object} opts
   * @param {string[]} opts.add_items
   * @returns {SmartContext}
   */
  new_context(data = {}, opts = {}) {
    const item = new this.item_type(this.env, data);
    if(Array.isArray(opts.add_items)) item.add_items(opts.add_items);
    this.set(item);
    item.queue_save();
    item.emit_event('context:created');
    return item;
  }
  /**
   * Default settings for all SmartContext items in this collection.
   * @readonly
   */
  static get default_settings() {
    return {
      template_before: '<context>\n{{FILE_TREE}}',
      template_after: '</context>',
    };
  }

  get settings_config() {
    return {
      ...(this.env.config.actions.context_merge_template?.settings_config || {}),
    };
  }
  get_ref(key) {
    const collection = key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
    return collection.get(key);
  }
}

/* default export consumed by SmartEnv */
export default {
  class          : SmartContexts,
  collection_key : "smart_contexts",
  data_adapter   : AjsonSingleFileCollectionDataAdapter,
  item_type      : SmartContext,
  version: 2,
};
