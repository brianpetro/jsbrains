export class FileCollectionDataAdapter extends CollectionDataAdapter {
  get fs() {
    return this.collection.data_fs || this.collection.env.data_fs;
  }
}

export class FileItemDataAdapter extends ItemDataAdapter {
  get fs() {
    return this.item.collection.data_fs || this.item.collection.env.data_fs;
  }
}
