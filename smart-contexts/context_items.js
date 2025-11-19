import { Collection } from 'smart-collections';
import { ContextItem } from './context_item.js';

import { BlockContextItemAdapter } from './adapters/context-items/block.js';
import { SourceContextItemAdapter } from './adapters/context-items/source.js';
import { ImageContextItemAdapter } from './adapters/context-items/image.js';
import { PdfContextItemAdapter } from './adapters/context-items/pdf.js';


export class ContextItems extends Collection {
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
      template_before: {
        type: 'textarea',
        name: 'Template Before',
        description: 'Template to wrap before the context item content.',
      },
      template_after: {
        type: 'textarea',
        name: 'Template After',
        description: 'Template to wrap after the context item content.',
      },
    };
  }

  get_adapter_class(key, item_data) {
    return this.context_item_adapters.find(adapter_class => adapter_class.detect(key, item_data));
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
