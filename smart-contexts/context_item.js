import { CollectionItem } from 'smart-collections';

export class ContextItem extends CollectionItem {
  // special handling because current name_to_collection_key removes "Items" suffix
  get collection () {
    return this.env.context_items;
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
    const segments = [];
    segments.push(await this.merge_template(this.settings.template_before || ''));
    const item_text = await this.context_type_adapter.read();
    segments.push(item_text);
    segments.push(await this.merge_template(this.settings.template_after || ''));
    return segments.join('\n');
  }
  async merge_template(template) {
    const merge_vars = await this.get_merge_vars();
    return template;
  }
  async get_merge_vars() {
    return this.context_type_adapter.get_merge_vars
      ? await this.context_type_adapter.get_merge_vars()
      : {}
    ;
  }
  async get_base64() {
    if (this.is_media) {
      return await this.context_type_adapter.get_base64();
    }
  }
  get is_media() {
    return this.context_type_adapter.is_media || false;
  }
  get item_ref () {
    return this.context_type_adapter.ref || null;
  }
  get size () {
    return this.context_type_adapter.size || 0;
  }
  // DEPRECATED METHODS
  /**
   * @deprecated in favor of get_text and get_media 
   */
  async add_to_snapshot(snapshot, opts = {}) {
    return this.context_type_adapter.add_to_snapshot(snapshot, opts);
  }
  /**
   * @deprecated in favor of context-suggest scoped actions (getter architecture)
   */
  async find_connections(opts = {}) {
    if (this.context_type_adapter.find_connections) {
      return this.context_type_adapter.find_connections(opts);
    }
    return [];
  }
}
