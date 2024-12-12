import { AjsonMultiFileCollectionDataAdapter, AjsonMultiFileItemDataAdapter } from 'smart-collections/adapters/ajson_multi_file.js';

/**
 * Maps class names to their corresponding collection keys for backward compatibility.
 * Also used to route block entries.
 */
const class_to_collection_key = {
  'SmartSource': 'smart_sources',
  'SmartNote': 'smart_sources', // DEPRECATED
  'SmartBlock': 'smart_blocks',
  'SmartDirectory': 'smart_directories',
};

/**
 * @class AjsonMultiFileSourcesDataAdapter
 * @extends AjsonMultiFileCollectionDataAdapter
 * @description
 * Collection-level adapter for handling multi-file AJSON storage of sources and their blocks.
 * Each source and its associated blocks share a single `.ajson` file.
 *
 * This class orchestrates load/save/delete for the `smart_sources` collection, 
 * delegating per-item logic to `AjsonMultiFileSourceDataAdapter`.
 */
export class AjsonMultiFileSourcesDataAdapter extends AjsonMultiFileCollectionDataAdapter {
  ItemDataAdapter = AjsonMultiFileSourceDataAdapter;
}


/**
 * @class AjsonMultiFileSourceDataAdapter
 * @extends AjsonMultiFileItemDataAdapter
 * @description
 * Specialized adapter for a SmartSource `.ajson` file that contains the source and its blocks.
 *
 * On load, it determines final states of the source and its blocks, and can rewrite the file minimally.
 * On save, it now appends lines for the source (if needed) and all blocks that `_queue_save` at once.
 */
export class AjsonMultiFileSourceDataAdapter extends AjsonMultiFileItemDataAdapter {
  async load() {
    const data_path = this.get_data_path();
    if (!(await this.fs.exists(data_path))) {
      this.item.queue_import();
      return;
    }

    const raw_data = await this._read_item_file();
    if (!raw_data) {
      this.item.queue_import();
      return;
    }

    // Parse lines and get final states for all items
    const { final_states, rewrite_needed } = this._parse(raw_data);

    // Apply final state to source
    const source_data = final_states[this.item.key];
    if (!source_data && !this.item.deleted) {
      this.item.queue_import();
      if (rewrite_needed) {
        await this._rewrite_minimal_file_for_multi(final_states);
      }
      return;
    }
    if (source_data) {
      this.item.data = source_data;
      this.item._queue_load = false;
      this.item.loaded_at = Date.now();
    } else {
      // Source deleted
      this.item.deleted = true;
      this.item._queue_load = false;
    }

    // Apply final states to blocks
    const block_collection = this.item.env.smart_blocks;
    for (const [key, data] of Object.entries(final_states)) {
      if (key === this.item.key) continue;
      // It's a block
      const existing_block = block_collection.get(key);
      if (data) {
        let block = existing_block;
        if (!block) {
          const BlockType = block_collection.item_type;
          block = new BlockType(this.item.env, data);
          block.data.key = key;
          block_collection.set(block);
        } else {
          block.data = data;
        }
        block._queue_load = false;
        block.loaded_at = Date.now();
      } else {
        // Deleted block
        if (existing_block) block_collection.delete_item(key);
      }
    }

    // If rewrite needed, rewrite minimal file
    if (rewrite_needed) {
      await this._rewrite_minimal_file_for_multi(final_states);
    }
  }

  async save() {
    const data_path = this.get_data_path();
    const dir = this.collection_adapter.collection.data_dir;
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir);
    }

    // Collect lines for source and blocks that need saving
    const lines = [];

    // If this source needs saving
    if (this.item._queue_save) {
      const source_line = this._build_ajson_line(this.item, this.item.deleted ? null : this.item.data);
      lines.push(source_line);
    }

    // Check blocks associated with this source
    for (const block of this.item.blocks) {
      if (block._queue_save) {
        const block_line = this._build_ajson_line(block, block.deleted ? null : block.data);
        lines.push(block_line);
      }
    }

    // If there are lines to write
    if (lines.length > 0) {
      // Append them all at once
      // If the file already exists and is non-empty, prepend a newline before first line
      // If not sure, can always prepend '\n' to ensure separation
      const to_append = '\n' + lines.join('\n');
      await this.fs.append(data_path, to_append);

      // Mark them as saved
      this.item._queue_save = false;
      for (const block of this.item.blocks) {
        if (block._queue_save) {
          block._queue_save = false;
        }
      }
    }
  }

  async delete() {
    // Append a null line for this item
    const data_path = this.get_data_path();
    const ajson_line = this._build_ajson_line(this.item, null);
    await this.fs.append(data_path, '\n' + ajson_line);
    this.item.collection.delete_item(this.item.key);
  }

  async overwrite_saved_data(ajson = null) {
    // Overwrite with minimal lines:
    // One for the source if not deleted, one per non-deleted block
    if (!ajson) {
      const lines = [];
      if (!this.item.deleted) {
        lines.push(this._build_ajson_line(this.item, this.item.data));
      }
      for (const block of this.item.blocks) {
        if (!block.deleted) {
          lines.push(this._build_ajson_line(block, block.data));
        }
      }
      ajson = lines.join('\n');
    }
    const data_path = this.get_data_path();
    await this.fs.write(data_path, ajson);
  }

  _parse(ajson) {
    const final_states = {};
    if (!ajson.length) return { final_states, rewrite_needed: false };

    // trim once
    ajson = ajson.trim();

    // temp: for backwards compatibility
    ajson = this._make_backwards_compatible_with_trailing_comma_format(ajson);

    const original_line_count = ajson.split('\n').length;

    let json_str;
    try {
      json_str = '{' + ajson.slice(0, -1) + '}';
    } catch (e) {
      console.warn("Error preparing JSON string:", e);
      return { final_states, rewrite_needed: false };
    }

    let changed = false;
    let data = {};
    try {
      data = JSON.parse(json_str);
    } catch (e) {
      console.warn("Error parsing multi-line JSON:", e);
      console.warn(this.item.key);
      return { final_states, rewrite_needed: true };
    }

    for (const [ajson_key, value] of Object.entries(data)) {
      const { new_ajson_key, changed: changed_in_this_loop } = this._rewrite_legacy_ajson_keys(ajson_key);
      const item_key = new_ajson_key.split(':').slice(1).join(':');
      final_states[item_key] = value;
      changed = changed || changed_in_this_loop;
    }

    const rewrite_needed = changed || (original_line_count > Object.keys(final_states).length);

    return { final_states, rewrite_needed };
  }


  async _rewrite_minimal_file_for_multi(final_states) {
    const data_path = this.get_data_path();
    const lines = [];
    for (const [key, data] of Object.entries(final_states)) {
      if (data !== null) {
        // Determine item instance: if key is source key (this.item.key), use this.item
        // else it's a block
        let item;
        if (key === this.item.key) {
          item = this.item;
        } else {
          item = this.item.env.smart_blocks.get(key);
        }
        // If no item found in memory, we can reconstruct a minimal mock line
        if (!item) {
          const collection_key = this._guess_collection_key_from_data(data);
          lines.push(this._make_ajson_line_for_arbitrary_key(key, data, collection_key));
        } else {
          lines.push(this._build_ajson_line(item, data));
        }
      }
    }
    if (lines.length) {
      await this.fs.write(data_path, lines.join('\n'));
    } else {
      console.warn("No active items remain, removing file", data_path);
      // No active items remain, remove file
      if (await this.fs.exists(data_path)) await this.fs.remove(data_path);
    }
  }

  _make_ajson_line_for_arbitrary_key(key, data, collection_key='smart_sources') {
    const data_value = data === null ? 'null' : JSON.stringify(data);
    return `${JSON.stringify(`${collection_key}:${key}`)}: ${data_value},`;
  }

  _guess_collection_key_from_data(data) {
    if (data?.class_name && class_to_collection_key[data.class_name]) {
      return class_to_collection_key[data.class_name];
    }
    return 'smart_sources';
  }
}
