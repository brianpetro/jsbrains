import { SmartEntities } from "smart-entities";
export class SourceBlocks extends SmartEntities {
  constructor(source_collection) {
    this.source_collection = source_collection;
    this.source_collection.block_collections[this.collection_key] = this;
  }
  get env() { return this.source_collection.env; }
  async create(source, content){
  }
}