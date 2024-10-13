import { create_hash } from "../utils/create_hash.js";
export class SourceAdapter {
  constructor(item, opts = {}) {
    this.item = item;
    this.opts = opts;
  }
  get collection() { return this.item.collection; }
  get env() { return this.collection.env; }
  get smart_change() { return this.collection.smart_change; }
  get block_collection() { return this.env.smart_blocks; }
  get source_collection() { return this.env.smart_sources; }
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
  // HELPER METHODS
  async create_hash(content) { return await create_hash(content); }
}