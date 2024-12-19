import { create_hash } from "../utils/create_hash.js";

export class SourceContentAdapter {
  constructor(item) {
    this.item = item;
  }
  async import() { this.throw_not_implemented('import'); }
  async create() { this.throw_not_implemented('create'); }
  async update() { this.throw_not_implemented('update'); }
  async read() { this.throw_not_implemented('read'); }
  async remove() { this.throw_not_implemented('remove'); }
  // HELPER METHODS
  get data() { return this.item.data; }
  async create_hash(content) { return await create_hash(content); }
}

export default {
  item: SourceContentAdapter
};