export class SourceAdapter {
  constructor(item) {
    this.item = item;
  }
  get collection() { return this.item.collection; }
  get env() { return this.collection.env; }
  get smart_change() { return this.collection.smart_change; }
  async import() { throw new Error("import method not implemented for " + this.item.file_type); }
  async append(content) { throw new Error("append method not implemented for " + this.item.file_type); }
  async update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.item.file_type); }
  async _update(content) { throw new Error("_update method not implemented for " + this.item.file_type); }
  async read(opts = {}) { throw new Error("read method not implemented for " + this.item.file_type); }
  async _read() { throw new Error("_read method not implemented for " + this.item.file_type); }
  async remove() { throw new Error("remove method not implemented for " + this.item.file_type); }
  async move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.item.file_type); }
  async merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.item.file_type); }
  // block methods
  async block_append(content) { throw new Error("append method not implemented for " + this.item.file_type); }
  async block_update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.item.file_type); }
  async _block_update(content) { throw new Error("_update method not implemented for " + this.item.file_type); }
  async block_read(opts = {}) { throw new Error("read method not implemented for " + this.item.file_type); }
  async _block_read() { throw new Error("_read method not implemented for " + this.item.file_type); }
  async block_remove() { throw new Error("remove method not implemented for " + this.item.file_type); }
  async block_move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.item.file_type); }
  async block_merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.item.file_type); }
}