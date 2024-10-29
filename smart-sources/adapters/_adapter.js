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
  
  // override these methods in the adapter class
  throw_not_implemented(method_name) {
    throw new Error(`Method "${method_name}" is not implemented for file type "${this.item.file_type}" in "${this.constructor.name}".`);
  }
  // source methods
  async import() { this.throw_not_implemented('import'); }
  async append(content) { this.throw_not_implemented('append'); }
  async update(full_content, opts = {}) { this.throw_not_implemented('update'); }
  async _update(content) { this.throw_not_implemented('_update'); }
  async read(opts = {}) { this.throw_not_implemented('read'); }
  async _read() { this.throw_not_implemented('_read'); }
  async remove() { this.throw_not_implemented('remove'); }
  async move_to(entity_ref) { this.throw_not_implemented('move_to'); }
  async merge(content, opts = {}) { this.throw_not_implemented('merge'); }

  // block methods
  async block_append(content) { this.throw_not_implemented('block_append'); }
  async block_update(full_content, opts = {}) { this.throw_not_implemented('block_update'); }
  async _block_update(content) { this.throw_not_implemented('_block_update'); }
  async block_read(opts = {}) { this.throw_not_implemented('block_read'); }
  async _block_read() { this.throw_not_implemented('_block_read'); }
  async block_remove() { this.throw_not_implemented('block_remove'); }
  async block_move_to(entity_ref) { this.throw_not_implemented('block_move_to'); }
  async block_merge(content, opts = {}) { this.throw_not_implemented('block_merge'); }
  // HELPER METHODS
  async create_hash(content) { return await create_hash(content); }
}