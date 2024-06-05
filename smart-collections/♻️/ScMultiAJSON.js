const { LongTermMemory } = require('./long_term_memory');
const fs = require('fs').promises;
const path = require('path');

/**
 * Class representing a specialized form of LongTermMemory that handles multiple .ajson files.
 * It extends the LongTermMemory class to manage collections of items stored in .ajson format.
 */
class ScMultiAJSON extends LongTermMemory {

  /**
   * Asynchronously loads collection items from .ajson files within the specified data path.
   * It ensures that only .ajson files are processed and handles JSON parsing and item instantiation.
   */
  async load() {
    console.log("Loading collection items");
    const dataPath = this.data_path;
    try {
      await fs.access(dataPath);
    } catch (err) {
      await fs.mkdir(dataPath, { recursive: true });
    }
    const files = await fs.readdir(dataPath);
    for (const fileName of files) {
      const filePath = path.join(dataPath, fileName);
      if (filePath.endsWith('.ajson')) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(`{${content.endsWith(',') ? content.slice(0, -1) : content}}`);
          let pruned = '';
          Object.entries(data).forEach(([key, value]) => {
            const entity = new (this.env.item_types[value.class_name])(this.env, value);
            this.env[entity.collection_name].items[key] = entity;
            pruned += entity.ajson + ',\n';
          });
          await fs.writeFile(filePath, pruned.trim());
        } catch (err) {
          console.log("Error loading file: " + filePath);
          console.log(err.stack);
        }
      }
    }
    console.log("Loaded collection items");
  }

  /**
   * Schedules a save operation to prevent multiple saves happening at the same time.
   */
  save() {
    if (this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }

  /**
   * Asynchronously saves modified collection items to their respective .ajson files.
   * @param {boolean} [force=false] - Forces the save operation even if it's currently flagged as saving.
   */
  async _save(force = false) {
    let saved_ct = 0;
    if (this._saving) return console.log("Already saving");
    this._saving = true;
    setTimeout(() => { this._saving = false; }, 10000);
    const start = Date.now();
    console.log("Saving collection items");
    // ensure data_path exists
    if(!(await fs.access(this.data_path))) await this.adapter.mkdir(this.data_path);
    const items = Object.values(this.items).filter(i => i.vec && i.changed);
    if (items.length === 0) {
      this._saving = false;
      console.log("Nothing to save");
      return;
    }
    try {
      for (const item of items) {
        const itemFilePath = path.join(this.data_path, `${item.multi_ajson_file_name}.ajson`);
        await fs.appendFile(itemFilePath, '\n' + item.ajson + ',');
        saved_ct++;
      }
      const end = Date.now();
      const time = end - start;
      console.log(`Saved ${saved_ct} collection items in ${time}ms`);
    } catch (err) {
      console.error("Error saving collection items");
      console.error(err.stack);
    }
    this._saving = false;
  }

  /**
   * Validates the save operation by comparing the file sizes of the new and old files.
   * @param {string} new_file_path - Path to the new file.
   * @param {string} old_file_path - Path to the old file.
   * @returns {Promise<boolean>} - True if the new file size is at least 50% of the old file size, otherwise false.
   */
  async validate_save(new_file_path, old_file_path) {
    try {
      const newStats = await fs.stat(new_file_path);
      const oldStats = await fs.stat(old_file_path);
      console.log("New file size: " + newStats.size + " bytes");
      console.log("Old file size: " + oldStats.size + " bytes");
      return newStats.size > (oldStats.size * 0.5);
    } catch (err) {
      console.log("Error validating file sizes:", err);
      return false;
    }
  }

  /**
   * Gets the data path for storing .ajson files, appending '/multi' to the base path.
   * @returns {string} The data path for .ajson files.
   */
  get data_path() { return path.join(super.data_path, 'multi'); }
}

exports.ScMultiAJSON = ScMultiAJSON;
