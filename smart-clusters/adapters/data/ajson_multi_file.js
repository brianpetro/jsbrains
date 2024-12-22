import { AjsonMultiFileCollectionDataAdapter, AjsonMultiFileItemDataAdapter } from 'smart-collections/adapters/ajson_multi_file.js';

/**
 * @class AjsonMultiFileGroupsDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Similar to the sources adapter, but for groups (directories).
 * Handles load/save/delete operations for directory groups.
 */
export class AjsonMultiFileClustersDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  ItemDataAdapter = AjsonMultiFileClusterDataAdapter;
  get_data_file_name(key) {
    return 'clusters';
  }
}

/**
 * @class AjsonMultiFileGroupDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * Handles individual directory group items stored in append-only AJSON files.
 */
export class AjsonMultiFileClusterDataAdapter extends AjsonMultiFileItemDataAdapter {

}

export default {
  collection: AjsonMultiFileClustersDataAdapter,
  item: AjsonMultiFileClusterDataAdapter
};

