export class SmartCollectionDataAdapter{
  constructor(item) {
    this.item = item;
  }
  // REQUIRED METHODS IN SUBCLASSES
  async load() { throw new Error("SmartCollectionItemAdapter: load() not implemented"); }
  async save() { throw new Error("SmartCollectionItemAdapter: save() not implemented"); }
  // END REQUIRED METHODS IN SUBCLASSES

  get env() { return this.item.env; }
  get data_path() { return 'collections.json'; }
  get key() { return this.item.key; }
  get collection_name() { return this.item.collection_name; }
  get collection() { return this.item.collection; }

}