import { Collection } from 'smart-collections';
import { ContextItem } from './context_item.js';

import { BlockContextItemAdapter } from './adapters/context-items/block.js';
import { SourceContextItemAdapter } from './adapters/context-items/source.js';
import { ImageContextItemAdapter } from './adapters/context-items/image.js';
import { PdfContextItemAdapter } from './adapters/context-items/pdf.js';

export class ContextItems extends Collection {
  constructor(smart_context, opts = {}) {
    super(smart_context.env || smart_context, opts); // OR pass directly for env loading (temp patch, should now be loaded by env)
    this.smart_context = smart_context;
  }
  async load() {
    console.log('ContextItems: load called');
    // TODO DECIDED: add default settings from context_item_merge_template action if not already present????
    // ALT: handle in action itself? (easy access to the default settings there)
  }

  static version = 1;

  get context_item_adapters() {
    if (!this._context_item_adapters) {
      this._context_item_adapters = Object.values(this.opts.context_item_adapters).sort((a, b) => {
        const order_a = a.order || 0;
        const order_b = b.order || 0;
        return order_a - order_b; // ascending
      });
    }
    return this._context_item_adapters;
  }

  new_item(data) {
    const item = new this.item_type(this.env, data);
    this.set(item);
    return item;
  }

  process_load_queue() { /* skip */ }

  get settings_config() {
    return {
      ...(this.env.config.actions.context_item_merge_template?.settings_config || {}),
    };
  }

  static get default_settings() {
    return {
      template_preset: 'xml_structured',
      template_before: '<item loc="{{KEY}}" at="{{TIME_AGO}}">',
      template_after: '</item>',
    };
  }

  /**
   * @param {object} context_items_data - data.context_items{}
   * @param {object} params
   * @param {string} [params.codeblock_source_key] - Optional key of the current source for codeblock context (glues name change sync)
   * @returns {ContextItem[]}
   */
  load_from_data(context_items_data, params = {}) {
    const loaded_items = [];
    if(!this.items) this.items = {};
    const named_context_stack = Array.isArray(params.named_context_stack)
      ? params.named_context_stack
      : [this.smart_context?.data?.name].filter(Boolean)
    ;
    const load_params = {
      ...params,
      named_context_stack,
    };
    const entries = Object.entries(context_items_data || {});
    for (let i = 0; i < entries.length; i++) {
      const [key, item_data] = entries[i];
      const loaded = this.load_item_from_data(key, item_data, load_params);
      if (loaded) {
        if (Array.isArray(loaded)) {
          if (!loaded.length) continue;
          const total_size = loaded.reduce((sum, item) => sum + (item.size || 0), 0);
          const latest_mtime = Math.max(...loaded.map((item) => item.mtime));
          item_data.size = total_size;
          item_data.mtime = latest_mtime;
          item_data.group_items_ct = loaded.length;
          loaded_items.push(...loaded);
        } else {
          item_data.size = loaded.size;
          item_data.mtime = loaded.mtime;
          loaded_items.push(loaded);
        }
      }
    }
    return loaded_items;
  }

  /**
   * @param {string} key
   * @param {object} item_data
   * @param {object} params
   * @param {string} [params.codeblock_source_key] - Optional key of the current source for codeblock context (glues name change sync)
   * @return {ContextItem|ContextItem[]|null}
   */
  load_item_from_data(key, item_data, params = {}) {
    if (item_data.named_context) {
      return this.load_named_context_items(key, item_data, params);
    } else {
      // DO NOT ADD ITEM FOR GROUP-TYPE CONTEXT ITEMS (those with "folder"/"named_context" property)
      return this.new_item({
        key,
        ...item_data,
      });
    }
  }


  load_named_context_items(key, item_data, params = {}) {
    let resp = null;
    const named_context_name = item_data?.key || key;
    const named_context_stack = Array.isArray(params.named_context_stack)
      ? params.named_context_stack
      : []
    ;
    const named_context = this.env.smart_contexts.filter((ctx) => ctx.data.name === named_context_name)[0];
    if (named_context) {
      if (named_context === this.smart_context || named_context_stack.includes(named_context_name)) {
        return null; // prevent circular reference and self reference
      }
      const loaded_items = this.load_from_data(named_context.data.context_items || {}, {
        ...params,
        named_context_stack: [...named_context_stack, named_context_name],
      });
      if (!loaded_items.length) return null;
      loaded_items.forEach((item) => {
        if (!item?.data || typeof item.data !== 'object') return;
        item.data.from_named_context = named_context_name;
      });
      // if params.codeblock_source_key is present
      if (typeof params.codeblock_source_key !== 'undefined') {
        // add reference to named context use in name change syncing
        if (!named_context.data.codeblock_inclusions) named_context.data.codeblock_inclusions = {};
        named_context.data.codeblock_inclusions[params.codeblock_source_key] = Date.now();
        named_context.queue_save();
      }
      resp = loaded_items;
    } else {
      console.warn(`ContextItems.load_from_data: named context "${item_data.key}" not found`);
      this.emit_error_event('context_items:load_from_data', {
        message: 'Named context not found',
        named_context: item_data.named_context,
      });
      resp = null;
    }
    return resp;
  }
}

export default {
  version: ContextItems.version,
  class: ContextItems,
  collection_key: 'context_items',
  item_type: ContextItem,
  context_item_adapters: {
    BlockContextItemAdapter,
    SourceContextItemAdapter,
    ImageContextItemAdapter,
    PdfContextItemAdapter,
  },
};
