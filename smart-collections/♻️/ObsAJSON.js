const { LongTermMemory } = require('./long_term_memory');
/**
 * Class ObsAJSON extends LongTermMemory to handle JSON-based storage of collections.
 * This class provides methods to load and save collections to a JSON file with asynchronous operations,
 * ensuring data integrity and error handling. It uses an adapter to interact with the file system.
 */
class ObsAJSON extends LongTermMemory {
  /**
   * Constructs an instance of ObsAJSON.
   * @param {Object} collection - The collection to be managed.
   */
  constructor(collection) {
    super(collection);
    this.adapter = this.env.main.app.vault.adapter;
  }

  /**
   * Asynchronously loads the collection from a JSON file.
   * Parses the file content and initializes collection items based on the stored data.
   * Handles file not found errors by creating necessary directories and files.
   */
  async load() {
    console.log("Loading: " + this.file_path);
    try {
      (await this.adapter.read(this.file_path))
        .split(",\n")
        .filter(batch => batch) // remove empty strings
        .forEach((batch, i) => {
          const items = JSON.parse(`{${batch}}`);
          Object.entries(items).forEach(([key, value]) => {
            this.collection.items[key] = new (this.env.item_types[value.class_name])(this.env, value);
          });
        })
      ;
      console.log("Loaded: " + this.file_name);
    } catch (err) {
      console.log("Error loading: " + this.file_path);
      console.log(err.stack); // stack trace
      // Create folder and file if they don't exist
      if (err.code === 'ENOENT') {
        this.items = {};
        // this.keys = []; // replaced by getter
        try {
          await this.adapter.mkdir(this.data_path);
          await this.adapter.write(this.file_path, "");
        } catch (creationErr) {
          console.log("Failed to create folder or file: ", creationErr);
        }
      }
    }
  }

  // wraps _save in timeout to prevent multiple saves at once
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }

  /**
   * Saves the collection to a JSON file. This method is throttled to prevent multiple saves at once.
   * @param {boolean} [force=false] - Forces the save operation even if currently saving.
   */
  async _save(force=false) {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = null;
    if(this._saving) return console.log("Already saving: " + this.file_name);
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const start = Date.now();
    console.log("Saving: " + this.file_name);
    // rename temp file
    const temp_file_path = this.file_path.replace('.ajson', '.temp.ajson');
    if(await this.adapter.exists(temp_file_path)) await this.adapter.remove(temp_file_path);
    try {
      // init temp file
      await this.adapter.write(temp_file_path, "");
      let file_content = [];
      const items = Object.values(this.items).filter(i => i.vec);
      const batches = Math.ceil(items.length / 1000);
      for(let i = 0; i < batches; i++) {
        file_content = items.slice(i * 1000, (i + 1) * 1000).map(i => i.ajson);
        const batch_content = file_content.join(",");
        await this.adapter.append(temp_file_path, batch_content + ",\n");
      }
      // append last batch
      if(items.length > batches * 1000) {
        await this.adapter.append(temp_file_path, items.slice(batches * 1000).map(i => i.ajson).join(",") + ",\n");
      }
      const end = Date.now(); // log time
      const time = end - start;
      if(force || await this.validate_save(temp_file_path, this.file_path)) {
        if(await this.adapter.exists(this.file_path)) await this.adapter.remove(this.file_path);
        await this.adapter.rename(temp_file_path, this.file_path);
        console.log("Saved " + this.file_name + " in " + time + "ms");
      }else{
        console.log("Not saving " + this.file_name + " because new file is less than 50% of old file");
      }
    } catch (err) {
      console.error("Error saving: " + this.file_name);
      console.error(err.stack);
      // set new file to "failed" and rename to inlclude datetime
      const failed_file_path = temp_file_path.replace('.temp.', '.failed-' + Date.now() + '.');
      await this.adapter.rename(temp_file_path, failed_file_path);
    }
    this._saving = false;
    // remove temp file after new file is saved
    if(await this.adapter.exists(temp_file_path) && await this.adapter.exists(this.file_path)) await this.adapter.remove(temp_file_path);
  }

  /**
   * Validates the new file size against the old file size to ensure data integrity.
   * @param {string} new_file_path - Path to the new file.
   * @param {string} old_file_path - Path to the old file.
   * @returns {Promise<boolean>} True if the new file size is more than 50% of the old file size, otherwise false.
   */
  async validate_save(new_file_path, old_file_path) {
    const new_file_size = (await this.adapter.stat(new_file_path))?.size;
    const old_file_size = (await this.adapter.stat(old_file_path))?.size;
    if(!old_file_size) return true;
    console.log("New file size: " + new_file_size + " bytes");
    console.log("Old file size: " + old_file_size + " bytes");
    return new_file_size > (old_file_size * 0.5);
  }

  get file_name() { return super.file_name + '.ajson'; }
}

exports.ObsAJSON = ObsAJSON;