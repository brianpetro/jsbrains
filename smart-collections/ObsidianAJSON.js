const { LongTermMemory } = require('./long_term_memory');
/**
 * Class representing a specialized JSON storage system for Obsidian, extending the LongTermMemory class.
 * This class handles the loading and saving of collections in a JSON format with specific handling
 * for memory optimization and error management.
 */
class ObsidianAJSON extends LongTermMemory {
  /**
   * Creates an instance of ObsidianAJSON.
   * @param {Object} collection - The collection of items to be managed.
   */
  constructor(collection) {
    super(collection);
    this.adapter = this.brain.main.app.vault.adapter;
  }

  /**
   * Asynchronously loads the collection from a JSON file.
   * Parses the JSON file, instantiates items based on their class names, and handles errors such as missing files.
   */
  async load() {
    console.log("Loading: " + this.file_path);
    try {
      // replaced reviver b/c it was using too much memory
      Object.entries(JSON.parse(`{${await this.adapter.read(this.file_path)}}`)).forEach(([key, value]) => {
        this.collection.items[key] = new (this.brain.item_types[value.class_name])(this.brain, value);
        // this.collection.keys.push(key); // replaced by getter
      });
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

  /**
   * Saves the collection to a file with a delay to prevent multiple saves at once.
   * This method sets up a timeout to delay the actual save operation.
   */
  save() {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => { this._save(); }, 10000);
  }

  /**
   * Internal method to save the collection to a file.
   * It checks for conditions to avoid unnecessary saves and handles errors.
   * @param {boolean} [force=false] - Forces the save operation regardless of the usual checks.
   */
  async _save(force=false) {
    if(this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = null;
    if(this._saving) return console.log("Already saving: " + this.file_name);
    this._saving = true; // prevent multiple saves at once
    setTimeout(() => { this._saving = false; }, 10000); // set _saving to false after 10 seconds
    const start = Date.now();
    console.log("Saving: " + this.file_name);
    try {
      // const file_content = JSON.stringify(this.items, this.replacer.bind(this), 2); // pretty print
      const file_content = JSON.stringify(this.items, this.replacer.bind(this)); // minified
      const new_size = file_content.length;
      if(!force && (new_size < 100)) return console.log("File content empty, not saving"); // if file content empty, do not save
      const old_size = (await this.adapter.stat(this.file_path))?.size || 0;
      if(!force && (new_size < (0.8 * old_size))) return console.log("File content smaller than 80% of original, not saving " + this.file_name ); // if file content smaller than 80% of original, do not save
      // replaced slice with substring and removed comma (prefix appends with comma instead of suffix to prevent removal at load)
      await this.adapter.write( this.file_path, file_content.substring(1, file_content.length - 1));
      const end = Date.now(); // log time
      const time = end - start;
      console.log("Saved " + this.file_name + " in " + time + "ms");
    } catch (err) {
      console.error("Error saving: " + this.file_name);
      console.error(err.stack);
    }
    this._saving = false;
  }

  /**
   * Getter for the file name with a custom extension.
   * @returns {string} The file name appended with '.ajson'.
   */
  get file_name() { return super.file_name + '.ajson'; }
}

exports.ObsidianAJSON = ObsidianAJSON;