export class SmartEnvSettings {
  constructor(env, opts={}) {
    this.env = env;
    this.fs = new this.env.smart_fs_class(this.env, {
      adapter: this.env.smart_fs_adapter_class,
      env_path: opts.env_path,
      smart_env_data_folder: opts.smart_env_data_folder
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
    await this.fs.smart_env_data.write(
      '.smart_env.json',
      JSON.stringify(smart_env_settings, null, 2)
    );
    this._saved = true;
  }
  async load() {
    if(!(await this.fs.smart_env_data.exists('.smart_env.json'))) await this.save({});
    this._settings = JSON.parse(await this.fs.smart_env_data.read('.smart_env.json'));
    for(const key of this.env.mains){
      this._settings[key] = await this.env[key].load_settings();
    }
    this._saved = true;
  }
}