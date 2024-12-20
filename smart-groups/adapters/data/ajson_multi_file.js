import { AjsonMultiFileCollectionDataAdapter, AjsonMultiFileItemDataAdapter } from 'smart-collections/adapters/ajson_multi_file.js';

/**
 * @class AjsonMultiFileGroupsDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Similar to the sources adapter, but for groups (directories).
 * Handles load/save/delete operations for directory groups.
 */
export class AjsonMultiFileGroupsDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  ItemDataAdapter = AjsonMultiFileGroupDataAdapter;
}

/**
 * @class AjsonMultiFileGroupDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * Handles individual directory group items stored in append-only AJSON files.
 */
export class AjsonMultiFileGroupDataAdapter extends AjsonMultiFileItemDataAdapter {
  get_data_path() {
    const dir = this.collection_adapter.collection.data_dir || 'groups';
    const sep = this.fs?.sep || '/';
    const file_name = this._get_data_file_name(this.item.key);
    return dir + sep + file_name + '.ajson';
  }

  _get_data_file_name(key) {
    return key
      .replace(/[\s\/\.]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+$/, '')
    ;
  }
}

export default {
  collection: AjsonMultiFileGroupsDataAdapter,
  item: AjsonMultiFileGroupDataAdapter
};
