import { CollectionItem } from 'smart-collections';

export class ContextItem extends CollectionItem {
  // special handling because current name_to_collection_key removes "Items" suffix
  get collection_key () {
    return 'context_items';
  }
  get context_type_adapter() {
    if (!this._context_type_adapter) {
      const Class = this.collection.context_item_adapters.find(adapter_class => adapter_class.detect(this.key, this.data));
      if (!Class) throw new Error(`No context item adapter found for key: ${this.key}`);
      this._context_type_adapter = new Class(this);
    }
    return this._context_type_adapter;
  }

  get exists() {
    return this.context_type_adapter.exists;
  }

  // v3
  async get_text() {
    const item_text = await this.context_type_adapter.get_text();
    if (typeof item_text !== 'string') return item_text;
    if (typeof this.actions.context_item_merge_template === 'function') {
      return await this.actions.context_item_merge_template(item_text);
    }
    return item_text;
  }
  async get_base64() {
    if (this.is_media) {
      return await this.context_type_adapter.get_base64();
    }
    return {error: `Context item is not media type: ${this.key}`};
  }
  async open (event = null) {
    return await this.context_type_adapter.open(event);
  }

  get is_media() {
    return this.context_type_adapter.is_media || false;
  }
  get item_ref () {
    return this.context_type_adapter.ref || null;
  }
  get size () {
    return this.data.size || this.context_type_adapter.size || 0;
  }
  get mtime() {
    return this.data.mtime || this.context_type_adapter.mtime || null;
  }
}
