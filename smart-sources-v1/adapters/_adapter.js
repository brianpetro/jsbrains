export class SourceAdapter {
  constructor(smart_source) {
    this.item = smart_source;
  }
  get collection() { return this.item.collection; }
  get smart_change() { return this.collection.smart_change; }
  async append(content) { throw new Error("append method not implemented for " + this.item.file_type); }
  async update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.item.file_type); }
  async _update(content) { throw new Error("_update method not implemented for " + this.item.file_type); }
  async read(opts = {}) { throw new Error("read method not implemented for " + this.item.file_type); }
  async _read() { throw new Error("_read method not implemented for " + this.item.file_type); }
  async remove() { throw new Error("remove method not implemented for " + this.item.file_type); }
  async move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.item.file_type); }
  async merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.item.file_type); }
}

export class BlockAdapter {
  constructor(smart_block) {
    this.item = smart_block;
  }
  get collection() { return this.item.collection; }
  get smart_change() { return this.collection.smart_change; }
  async append(content) { throw new Error("append method not implemented for " + this.item.file_type); }
  async update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.item.file_type); }
  async _update(content) { throw new Error("_update method not implemented for " + this.item.file_type); }
  async read(opts = {}) { throw new Error("read method not implemented for " + this.item.file_type); }
  async _read() { throw new Error("_read method not implemented for " + this.item.file_type); }
  async remove() { throw new Error("remove method not implemented for " + this.item.file_type); }
  async move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.item.file_type); }
  async merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.item.file_type); }
}