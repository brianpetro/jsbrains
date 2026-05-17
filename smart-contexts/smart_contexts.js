// @ts-check

import { Collection } from 'smart-collections';
import { AjsonSingleFileCollectionDataAdapter } from "smart-collections/adapters/ajson_single_file.js";
import { SmartContext } from './smart_context.js';

/** @typedef {import('smart-types').SettingsConfig} SettingsConfig */
/** @typedef {import('smart-types').SmartContextData} SmartContextData */
/** @typedef {SmartContext & Object.<string, *> & {env: *, data: SmartContextData & Object.<string, *>, key: string, collection: *, context_items: *, actions: Object.<string, *>, data_adapter: *, constructor: *, _missing_context_item_event_timers: Map<string, *>}} SmartContextInstance */
/** @typedef {SmartContexts & Object.<string, *> & {env: *, opts: Object.<string, *>, items: Object.<string, SmartContextInstance>, collection_key: string, data_adapter: *, item_type: new (env: *, data?: Object.<string, *>) => SmartContextInstance, constructor: typeof Collection & {key?: string}}} SmartContextsThis */

/**
 * @class SmartContexts
 * @extends Collection
 * @classdesc
 * Manages a collection of SmartContext items, each representing a set of references
 * or data relevant to a specific use case (e.g., building a textual context for AI).
 */
export class SmartContexts extends Collection {
  static version = '2.0.1';
  /**
   * new_context
   * @this {SmartContextsThis}
   * @param {Partial<SmartContextData>} data
   * @param {Object.<string, *> & {add_items?: string[]}} opts
   * @returns {SmartContextInstance}
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
   * @this {SmartContextsThis}
   * @param {string} name
   * @returns {*}
   */
  get_named_context(name) {
    return this.filter((ctx) => ctx.data?.name === name)[0];
  }
  /**
   * Default settings for all SmartContext items in this collection.
   * @readonly
   * @returns {Object.<string, *>}
   */
  static get default_settings() {
    return {
      template_preset: 'xml_structured',
      template_before: '<context>\n{{FILE_TREE}}',
      template_after: '</context>',
    };
  }

  /**
   * @this {SmartContextsThis}
   * @returns {SettingsConfig}
   */
  get settings_config() {
    return {
      ...(this.env.config.actions.context_merge_template?.settings_config || {}),
    };
  }
}

/* default export consumed by SmartEnv */
export default {
  class          : SmartContexts,
  collection_key : "smart_contexts",
  data_adapter   : AjsonSingleFileCollectionDataAdapter,
  item_type      : SmartContext,
  version: SmartContexts.version,
};
