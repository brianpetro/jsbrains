/**
 * Represents settings for the Smart Environment.
 */
export class SmartEnvSettings {
  /**
   * Creates an instance of SmartEnvSettings.
   * @param {Object} env - The environment object.
   * @param {Object} [opts={}] - Configuration options.
   * @param {string} opts.env_data_dir - The directory path for environment data.
   */
  constructor(env, opts = {}) {
    this.env = env;
    if (!opts.modules.smart_fs) throw new Error('smart_fs is required in smart_env_config');
    this.opts = opts;
    this._fs = null;
    this._settings = {};
    this._saved = false;
  }

  /**
   * Gets the current settings, wrapped with an observer to handle changes.
   * @returns {Proxy} A proxy object that observes changes to the settings.
   */
  get settings() { return observe_object(this._settings, (property, value, target) => this.save()); }

  /**
   * Sets the current settings.
   * @param {Object} settings - The new settings to apply.
   */
  set settings(settings) { this._settings = settings; }

  /**
   * Saves the current settings to the file system.
   * @param {Object|null} [settings=null] - Optional settings to override the current settings before saving.
   * @returns {Promise<void>} A promise that resolves when the settings have been saved.
   */
  async save(settings = null) {
    if (settings) this._settings = settings;
    this._saved = false;
    const settings_keys = Object.keys(this._settings);
    const smart_env_settings = {};
    for (const key of settings_keys) {
      if (this.env.mains.includes(key)) {
        await this.env[key].save_settings(this._settings[key]);
      } else {
        smart_env_settings[key] = this._settings[key];
        // TODO: decided: may check if present in main.settings and remove
      }
    }
    if (!await this.fs.exists('')) await this.fs.mkdir('');
    await this.fs.write(
      'smart_env.json',
      JSON.stringify(smart_env_settings, null, 2)
    );
    this._saved = true;
    // console.log("saved smart_env settings", JSON.stringify(smart_env_settings, null, 2));
  }

  /**
   * Gets the file system instance, initializing it if necessary.
   * @returns {Object} The file system instance.
   */
  get fs() {
    if (!this._fs){
      const config = this.opts.modules.smart_fs;
      const _class = config?.class ?? config;
      this._fs = new _class(this.env, {
        adapter: config.adapter,
        fs_path: this.env[this.env.mains[0]].settings.env_data_dir
      });
    }
    return this._fs;
  }

  /**
   * Loads the settings from the file system.
   * @returns {Promise<void>} A promise that resolves when the settings have been loaded.
   */
  async load() {
    if (!this.opts.env_data_dir) await this.get_env_data_dir();
    if (!(await this.fs.exists('smart_env.json'))) {
      // temp: check if .smart_env.json exists in old location
      if (await this.fs.exists('.smart_env.json')) {
        const old_settings = JSON.parse(await this.fs.read('.smart_env.json'));
        await this.save(old_settings);
        await this.fs.remove('.smart_env.json');
      } else {
        await this.save({});
      }
    }
    if (this.env.opts.default_settings) this._settings = this.env.opts.default_settings || {}; // set defaults if provided
    deep_merge(this._settings, JSON.parse(await this.fs.read('smart_env.json'))); // load saved settings
    deep_merge(this._settings, this.env.opts?.smart_env_settings || {}); // overrides saved settings
    for (const key of this.env.mains) {
      this._settings[key] = await this.env[key].load_settings();
    }
    await this.load_obsidian_settings();
    this._saved = true;
  }

  /**
   * Loads settings specific to Obsidian for backwards compatibility.
   * @returns {Promise<void>} A promise that resolves when Obsidian settings have been loaded.
   */
  async load_obsidian_settings() {
    if (this._settings.is_obsidian_vault && this.env.smart_connections_plugin) {
      const obsidian_settings = this._settings.smart_connections_plugin;
      this.transform_backwards_compatible_settings(obsidian_settings);
      await this.save();
      this.env.smart_connections_plugin.save_settings(obsidian_settings);
    }
  }

  /**
   * Transforms settings to maintain backwards compatibility with older configurations.
   * @param {Object} os - The old settings object to transform.
   */
  transform_backwards_compatible_settings(os) {
    if(this._settings.smart_sources?.embed_model_key){
      if(!this._settings.smart_sources.embed_model) this._settings.smart_sources.embed_model = {};
      this._settings.smart_sources.embed_model.model_key = this._settings.smart_sources.embed_model_key;
      delete this._settings.smart_sources.embed_model_key;
    }
    if (os.smart_sources_embed_model) {
      if (!this._settings.smart_sources) this._settings.smart_sources = {};
      if (!this._settings.smart_sources.embed_model) this._settings.smart_sources.embed_model = {};
      if (!this._settings.smart_sources.embed_model.model_key) this._settings.smart_sources.embed_model.model_key = os.smart_sources_embed_model;
      if (!this._settings.smart_sources.embed_model[os.smart_sources_embed_model]) this._settings.smart_sources.embed_model[os.smart_sources_embed_model] = {};
      delete os.smart_sources_embed_model;
    }
    if (os.smart_blocks_embed_model) {
      if (!this._settings.smart_blocks) this._settings.smart_blocks = {};
      if (!this._settings.smart_blocks.embed_model) this._settings.smart_blocks.embed_model = {};
      if (!this._settings.smart_blocks.embed_model.model_key) this._settings.smart_blocks.embed_model.model_key = os.smart_blocks_embed_model;
      if (!this._settings.smart_blocks.embed_model[os.smart_blocks_embed_model]) this._settings.smart_blocks.embed_model[os.smart_blocks_embed_model] = {};
      delete os.smart_blocks_embed_model;
    }
    if (os.api_key) {
      Object.entries(this._settings.smart_sources?.embed_model || {}).forEach(([key, value]) => {
        if (key.startsWith('text')) value.api_key = os.api_key;
        if (os.embed_input_min_chars && typeof value === 'object' && !value.min_chars) value.min_chars = os.embed_input_min_chars;
      });
      Object.entries(this._settings.smart_blocks?.embed_model || {}).forEach(([key, value]) => {
        if (key.startsWith('text')) value.api_key = os.api_key;
        if (os.embed_input_min_chars && typeof value === 'object' && !value.min_chars) value.min_chars = os.embed_input_min_chars;
      });
      delete os.api_key;
      delete os.embed_input_min_chars;
    }
    if(os.muted_notices) {
      if(!this._settings.smart_notices) this._settings.smart_notices = {};
      this._settings.smart_notices.muted = {...os.muted_notices};
      delete os.muted_notices;
    }
    if(os.smart_connections_folder){
      if(!os.env_data_dir) os.env_data_dir = os.smart_connections_folder;
      delete os.smart_connections_folder;
    }
    if(os.smart_connections_folder_last){
      os.env_data_dir_last = os.smart_connections_folder_last;
      delete os.smart_connections_folder_last;
    }
  }

  /**
   * Determines and sets the environment data directory.
   * @returns {Promise<void>} A promise that resolves when the environment data directory has been set.
   */
  async get_env_data_dir() {
    console.log("get_env_data_dir", this.env.opts.env_path);
    const fs_config = this.opts.modules.smart_fs;
    const fs_class = fs_config?.class ?? fs_config;
    const temp_fs = new fs_class(this.env, {
      adapter: fs_config.adapter,
      fs_path: this.env.opts.env_path || '',
    });
    const all = await temp_fs.list_recursive();
    let detected_env_data_folder = '.smart-env';
    all.forEach(file => {
      if (file.name === 'smart_env.json') {
        detected_env_data_folder = file.path.split(temp_fs.sep).slice(0, -1).join(temp_fs.sep);
        console.log("detected_env_data_folder", detected_env_data_folder);
      }
    });
    this.opts.env_data_dir = detected_env_data_folder;
    this._fs = null; // reset fs to force reload
    this.env[this.env.mains[0]].settings.env_data_dir = detected_env_data_folder;
    await this.env[this.env.mains[0]].save_settings();
    console.log("saved env_data_dir: ", this.opts.env_data_dir);
  }
}

/**
 * Deeply merges two objects without overwriting existing properties in the target object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
export function deep_merge_and_delete_no_overwrite(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (is_obj(source[key])) {
        if (!target.hasOwnProperty(key) || !is_obj(target[key])) {
          target[key] = {};
        }
        deep_merge_and_delete_no_overwrite(target[key], source[key]);
      } else if (!target.hasOwnProperty(key)) {
        target[key] = source[key];
        delete source[key];
      }
    }
  }
  return target;

  function is_obj(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}

/**
 * Deeply merges two objects, giving precedence to the properties of the source object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
export function deep_merge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      // both exist and are objects
      if (is_obj(source[key]) && is_obj(target[key])) deep_merge(target[key], source[key]);
      else target[key] = source[key]; // precedence to source
    }
  }
  return target;
  function is_obj(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
}

/**
 * Creates a proxy object that calls a function when a property is changed.
 * @param {Object} obj - The object to observe.
 * @param {Function} on_change - The function to call when a property is changed.
 * @returns {Proxy} The proxy object that observes changes.
 */
function observe_object(obj, on_change) {
  function create_proxy(target) {
    return new Proxy(target, {
      set(target, property, value) {
        if (target[property] !== value) {
          target[property] = value;
          on_change(property, value, target);
        }
        // If the value being set is an object or array, apply a proxy to it as well
        if (typeof value === 'object' && value !== null) {
          target[property] = create_proxy(value);
        }
        return true;
      },
      get(target, property) {
        const result = target[property];
        // If a property is an object or array, apply a proxy to it
        if (typeof result === 'object' && result !== null) {
          return create_proxy(result);
        }
        return result;
      }
    });
  }

  return create_proxy(obj);
}