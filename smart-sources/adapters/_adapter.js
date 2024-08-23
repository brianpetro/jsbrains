export class SourceAdapter {
  constructor(smart_source) {
    this.smart_source = smart_source;
  }
  async append(content) { throw new Error("append method not implemented for " + this.smart_source.file_type); }
  async update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.smart_source.file_type); }
  async _update(content) { throw new Error("_update method not implemented for " + this.smart_source.file_type); }
  async read(opts = {}) { throw new Error("read method not implemented for " + this.smart_source.file_type); }
  async _read() { throw new Error("_read method not implemented for " + this.smart_source.file_type); }
  async remove() { throw new Error("remove method not implemented for " + this.smart_source.file_type); }
  async move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.smart_source.file_type); }
  async merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.smart_source.file_type); }
}

export class BlockAdapter {
  constructor(smart_block) {
    this.smart_block = smart_block;
  }
  async append(content) { throw new Error("append method not implemented for " + this.smart_block.file_type); }
  async update(full_content, opts = {}) { throw new Error("update method not implemented for " + this.smart_block.file_type); }
  async _update(content) { throw new Error("_update method not implemented for " + this.smart_block.file_type); }
  async read(opts = {}) { throw new Error("read method not implemented for " + this.smart_block.file_type); }
  async _read() { throw new Error("_read method not implemented for " + this.smart_block.file_type); }
  async remove() { throw new Error("remove method not implemented for " + this.smart_block.file_type); }
  async move_to(entity_ref) { throw new Error("move_to method not implemented for " + this.smart_block.file_type); }
  async merge(content, opts = {}) { throw new Error("merge method not implemented for " + this.smart_block.file_type); }
}