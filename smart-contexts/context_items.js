import { Collection } from 'smart-collections';
import { ContextItem } from './context_item.js';

import { BlockContextItemAdapter } from './adapters/context-items/block.js';
import { SourceContextItemAdapter } from './adapters/context-items/source.js';
import { ImageContextItemAdapter } from './adapters/context-items/image.js';
import { PdfContextItemAdapter } from './adapters/context-items/pdf.js';


export class ContextItems extends Collection {
  async load() {
    console.log('ContextItems: load called');
    // TODO DECIDED: add default settings from context_item_merge_template action if not already present????
    // ALT: handle in action itself? (easy access to the default settings there)
  }
  static version = 1;
  get context_item_adapters() {
    if(!this._context_item_adapters) {
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

  get_adapter_class(key, item_data) {
    return this.context_item_adapters.find(adapter_class => adapter_class.detect(key, item_data));
  }
  static get default_settings() {
    return {
      template_before: '<item loc="{{KEY}}" at="{{TIME_AGO}}">',
      template_after: '</item>',
    }
  }
  load_from_data(context_items_data) {
    delete this.items; // clear existing items
    this.items = {};
    const entries = Object.entries(context_items_data || {});
    for(let i = 0; i < entries.length; i++) {
      const [key, item_data] = entries[i];
      if(item_data.exclude) continue; // skip excluded items
      this.new_item({
        key,
        ...item_data
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
  }
};
