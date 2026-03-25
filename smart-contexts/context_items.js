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

  load_from_data(context_items_data, params = {}) {
    // delete this.items; // clear existing items (REMOVED TO ALLOW RECURSION FOR NAMED CONTEXTS)
    if(!this.items) this.items = {};
    const entries = Object.entries(context_items_data || {});
    for (let i = 0; i < entries.length; i++) {
      const [key, item_data] = entries[i];
      this.load_item_from_data(key, item_data, params);
    }
  }

  load_item_from_data(key, item_data, params = {}) {
    if (item_data.named_context) {
      const named_context = this.env.smart_contexts.filter((ctx) => ctx.data.name === key)[0];
      if (named_context) {
        this.load_from_data(named_context.data.context_items || {});
        // if params.codeblock_source_key is present
        if(typeof params.codeblock_source_key === 'undefined') {
          // add reference to named context use in name change syncing
          if(!named_context.data.codeblock_inclusions) named_context.data.codeblock_inclusions = {};
          named_context.data.codeblock_inclusions[params.codeblock_source_key] = true;
          named_context.queue_save();
        }
      } else {
        console.warn(`ContextItems.load_from_data: named context "${item_data.named_context}" not found for item with key "${key}"`);
        this.emit_error_event('context_items:load_from_data', {
          message: 'Named context not found',
          named_context: item_data.named_context,
        });
      }
    } else {
      // DO NOT ADD ITEM FOR GROUP-TYPE CONTEXT ITEMS (those with "folder"/"named_context" property)
      this.new_item({
        key,
        ...item_data,
      });
    }
  }

}

export default {
  version: 1,
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
