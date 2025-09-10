/**
 * @file ajson_single_file.js
 * @description
 * A single-file variant of the AJSON adapter, extending the multi-file logic but funneling
 * all items into one shared `.ajson` file per collection.
 *
 * The file format is append-only JSON lines. Each line is:
 *   "{collection_key}:{item_key}": {...itemData...},
 * or
 *   "{collection_key}:{item_key}": null,
 * to indicate deletion.
 *
 * On load, we parse all lines once, compute final states, and optionally rewrite to a minimal
 * form (one line per active item). On save, each item appends a single line to reflect its
 * current state or null if deleted.
 */

import {
  AjsonMultiFileCollectionDataAdapter,
  AjsonMultiFileItemDataAdapter
} from './ajson_multi_file.js';
import { ajson_merge } from '../utils/ajson_merge.js';
/**
 * ---- NEW / COPIED FROM ajson_multi_file.js ----
 * Map for legacy class names => new collection keys.
 */
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

/**
 * ---- NEW / COPIED FROM ajson_multi_file.js ----
 * Parse a line key like "SmartNote:someKey" to unify class names => real collection keys.
 */
function _parse_ajson_key(ajson_key) {
  let changed = false;
  let [collection_key, ...item_key] = ajson_key.split(':');

  // If it's a legacy class name, map it to a modern collection key
  if (class_to_collection_key[collection_key]) {
    collection_key = class_to_collection_key[collection_key];
    changed = true;
  }

  return {
    collection_key,
    item_key: item_key.join(':'),
    changed
  };
}

/**
 * @class AjsonSingleFileCollectionDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Inherits from the multi-file adapter but forces a single `.ajson` file for all items
 * within this collection.
 */
export class AjsonSingleFileCollectionDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  /**
   * Returns the single shared `.ajson` file path for this collection.
   * @param {string} [key] - (unused) Item key, ignored in single-file mode.
   * @returns {string} The single .ajson file path for the entire collection.
   */
  get_item_data_path(key) {
    const file_name = (this.collection?.collection_key || 'collection') + '.ajson';
    const sep = this.fs?.sep || '/';
    const dir = this.collection.data_dir || 'data';
    return [dir, file_name].join(sep);
  }

  /**
   * Override process_load_queue to parse the entire single-file .ajson once,
   * distributing final states to items.
   *
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() {
    this.collection.emit_event('collection:load_started');
    this.collection.show_process_notice('loading_collection');


    // Ensure directory exists
    if (!(await this.fs.exists(this.collection.data_dir))) {
      await this.fs.mkdir(this.collection.data_dir);
    }

    const path = this.get_item_data_path();
    if (!(await this.fs.exists(path))) {
      // no .ajson file => nothing to load
      for (const item of Object.values(this.collection.items)) {
        if (item._queue_load) {
          // If no file, item might need import.
          item.queue_import?.();
        }
      }
      this.collection.clear_process_notice('loading_collection');
      this.collection.emit_event('collection:load_halted');
      return;
    }

    // Read entire single-file .ajson
    const raw_data = await this.fs.read(path, 'utf-8', { no_cache: true });
    if (!raw_data) {
      // File is empty or unreadable => no items loaded
      for (const item of Object.values(this.collection.items)) {
        if (item._queue_load) {
          item.queue_import?.();
        }
      }
      this.collection.clear_process_notice('loading_collection');
      this.collection.emit_event('collection:load_halted');
      return;
    }

    // Parse lines as partial JSON
    const { rewrite, file_data } = this.parse_single_file_ajson(raw_data);

    // If needed, rewrite minimal form
    if (rewrite) {
      if (file_data.length) {
        await this.fs.write(path, file_data);
      } else {
        await this.fs.remove(path);
      }
    }

    // Mark items as loaded
    for (const item of Object.values(this.collection.items)) {
      item._queue_load = false;
      item.loaded_at = Date.now();
    }

    this.collection.clear_process_notice('loading_collection');
    this.collection.emit_event('collection:load_completed');
  }


  /**
   * Helper to parse single-file .ajson content, distributing states to items.
   *
   * @param {string} raw
   * @returns {{ rewrite: boolean, file_data: string }}
   */
  parse_single_file_ajson(raw) {
    let rewrite = false;
    const lines = raw.trim().split('\n').filter(Boolean);
    // Start by building an object of final states
    let data_map = {};
    let line_count = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Expect something like: `"collection_key:item_key": {...},`
      if (!line.endsWith(',')) {
        // Attempt to fix trailing comma error
        rewrite = true;
      }
      const trimmed = line.replace(/,$/, ''); // remove trailing comma
      const combined = '{' + trimmed + '}';

      try {
        const obj = JSON.parse(combined); // e.g. { "collection_key:item_key": {...} }
        const [fullKey, value] = Object.entries(obj)[0];

        // ---- NEW: unify possible legacy class name => real collection key
        let { collection_key, item_key, changed } = _parse_ajson_key(fullKey);
        const newKey = `${collection_key}:${item_key}`;

        if (!value) {
          // null => deleted => remove from data_map
          delete data_map[newKey]; // ensure final is removed
          if (changed || newKey !== fullKey) {
            // remove the old key if it existed
            delete data_map[fullKey];
          }
          rewrite = true;
        } else {
          // store or overwrite
          data_map[newKey] = value;
          // if legacy rewriting is needed, remove old
          if (changed || newKey !== fullKey) {
            delete data_map[fullKey];
            rewrite = true;
          }
        }
      } catch (err) {
        console.warn('parse error for line: ', line, err);
        rewrite = true;
      }
      line_count++;
    }

    // Now update actual items in memory
    // or create them if they don't exist
    for (const [ajson_key, val] of Object.entries(data_map)) {
      // ajson_key is e.g. "smart_sources:someKey"
      const [collection_key, ...rest] = ajson_key.split(':');
      const item_key = rest.join(':');

      const collection = this.collection.env[collection_key];
      if (!collection) continue;

      let item = collection.get(item_key);
      if (!item) {
        const ItemClass = collection.item_type;
        item = new ItemClass(this.env, val);
        collection.set(item);
      } else {
        item.data = ajson_merge(item.data, val); // merge to prevent overwriting data made pre-load
      }
      item.loaded_at = Date.now();
      item._queue_load = false;
      if (!val.key) val.key = item_key;

    }

    // rewrite if lines needed fixing or if line_count > final entry count
    if (line_count > Object.keys(data_map).length) {
      rewrite = true;
    }

    // Build minimal lines
    let minimal_lines = [];
    for (const [ajson_key, val] of Object.entries(data_map)) {
      minimal_lines.push(`${JSON.stringify(ajson_key)}: ${JSON.stringify(val)},`);
    }

    return {
      rewrite,
      file_data: minimal_lines.join('\n')
    };
  }

  /**
   * Override process_save_queue for single-file approach.
   * We'll simply call save_item for each queued item, which appends a line to the same `.ajson`.
   *
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    this.collection.emit_event('collection:save_started');
    this.collection.show_process_notice('saving_collection');


    const save_queue = Object.values(this.collection.items).filter(item => item._queue_save);
    const time_start = Date.now();
    const batch_size = 50; // can be tuned

    for (let i = 0; i < save_queue.length; i += batch_size) {
      const batch = save_queue.slice(i, i + batch_size);
      await Promise.all(batch.map(item => {
        const adapter = this.create_item_adapter(item);
        return adapter.save().catch(err => {
          console.warn(`Error saving item ${item.key}`, err);
          item.queue_save();
        });
      }));
    }
    const deleted_items = Object.values(this.collection.items).filter(item => item.deleted);
    if(deleted_items.length){
      deleted_items.forEach(item => {
        delete this.collection.items[item.key];
      });
    }

    console.log(`Saved (single-file) ${this.collection.collection_key} in ${Date.now() - time_start}ms`);
    this.collection.clear_process_notice('saving_collection');
    this.collection.emit_event('collection:save_completed');
  }
}

/**
 * @class AjsonSingleFileItemDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * For single-file usage, every item references the same `.ajson`.
 */
export class AjsonSingleFileItemDataAdapter extends AjsonMultiFileItemDataAdapter {
  /**
   * Overridden to always return the single file path from the parent collection adapter.
   * @returns {string}
   */
  get data_path() {
    return this.collection_adapter.get_item_data_path(this.item.key);
  }

  /**
   * Load logic:
   * In single-file mode, we typically rely on the collection's `process_load_queue()`
   * to parse the entire file. This direct `load()` will do a naive re-parse as well
   * if used individually.
   */
  async load() {
    const path = this.data_path;
    if (!(await this.fs.exists(path))) {
      this.item.queue_import?.();
      return;
    }
    try {
      const raw_data = await this.fs.read(path, 'utf-8', { no_cache: true });
      if (!raw_data) {
        this.item.queue_import?.();
        return;
      }
      // parse entire file to find item
      const { rewrite } = this.collection_adapter.parse_single_file_ajson(raw_data);
      // if rewrite, rewrite handled at collection level next time
    } catch (err) {
      console.warn(`Error loading single-file item ${this.item.key}`, err);
      this.item.queue_import?.();
    }
  }
}

export default {
  collection: AjsonSingleFileCollectionDataAdapter,
  item: AjsonSingleFileItemDataAdapter
};
