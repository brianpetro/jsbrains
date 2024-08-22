export class SmartEnvSettings {
  constructor(env, opts={}) {
    this.env = env;
    if(!opts.smart_fs_class) throw new Error('smart_fs_class is required to instantiate SmartEnvSettings');
    this.fs = new opts.smart_fs_class(this.env, {
      adapter: opts.smart_fs_adapter_class,
      fs_path: opts.env_data_dir
    });
    this._settings = {};
    this._saved = false;
  }
  async save(settings=null) {
    if(settings) this._settings = settings;
    this._saved = false;
    const settings_keys = Object.keys(this._settings);
    const smart_env_settings = {};
    for(const key of settings_keys){
      if(this.env.mains.includes(key)){
        await this.env[key].save_settings(this._settings[key]);
      }else{
        smart_env_settings[key] = this._settings[key];
      }
    }
    await this.fs.write(
      '.smart_env.json',
      JSON.stringify(smart_env_settings, null, 2)
    );
    this._saved = true;
  }
  async load() {
    if(!(await this.fs.exists('.smart_env.json'))) await this.save({});
    this._settings = JSON.parse(await this.fs.read('.smart_env.json'));
    if(this.env.opts?.smart_env_settings) deep_merge(this._settings, this.env.opts.smart_env_settings);
    for(const key of this.env.mains){
      this._settings[key] = await this.env[key].load_settings();
    }
    await this.load_obsidian_settings();
    this._saved = true;
  }

  // TEMP: backwards compatibility
  async load_obsidian_settings() {
    if (this._settings.is_obsidian_vault) {
      if (await this.env.fs.exists('.obsidian')) {
        if (await this.env.fs.exists('.obsidian/plugins/smart-connections/data.json')) {
          const obsidian_settings = JSON.parse(await this.env.fs.read('.obsidian/plugins/smart-connections/data.json'));
          deep_merge_no_overwrite(this._settings, obsidian_settings);
          await this.save();
        }
      }
    }
  }
}
/**
 * Deeply merges two objects without overwriting existing properties in the target object.
 * @param {Object} target - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are sourced.
 * @returns {Object} The merged object.
 */
export function deep_merge_no_overwrite(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (is_obj(source[key])) {
        if (!target.hasOwnProperty(key) || !is_obj(target[key])) {
          target[key] = {};
        }
        deep_merge_no_overwrite(target[key], source[key]);
      } else if (!target.hasOwnProperty(key)) {
        target[key] = source[key];
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