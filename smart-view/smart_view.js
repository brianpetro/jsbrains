export class SmartView {
  constructor(env, opts={}) {
    this.env = env;
    this.opts = opts;
    this._adapter = null;
  }
  async render_setting_components(container) {
    const components = container.querySelectorAll(".setting-component");
    // await Promise.all(Array.from(components).map(async (elm) => {
    //   await this.render_setting_component(elm);
    // }));
    // one at a time
    for (const component of components) {
      console.log({component});
      await this.render_setting_component(component);
    }
  }
  create_doc_fragment(html) {
    return document.createRange().createContextualFragment(html);
  }
  // adapter methods
  get adapter() {
    if(!this._adapter) {
      this._adapter = new this.opts.adapter(this);
    }
    return this._adapter;
  }
  add_icon(icon_name) { return this.adapter.add_icon(icon_name); }
  async render_setting_component(setting_elm) { return await this.adapter.render_setting_component(setting_elm); }
  async render_markdown(markdown) { return await this.adapter.render_markdown(markdown); }
  get_by_env_path(path) { return get_by_path(this.env, path); }
  get_setting_by_path(path) { return get_by_path(this.env.settings, path); }
  set_setting_by_path(path, value) { set_by_path(this.env.settings, path, value); }
  delete_setting_by_path(path) { delete_by_path(this.env.smart_env_settings._settings, path); }
}


function get_by_path(obj, path) {
  if(!path) return '';
  const keys = path.split('.');
  const finalKey = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  // Check if the last key is a method and bind to the correct instance
  if (instance && typeof instance[finalKey] === 'function') {
    console.log({finalKey, instance});
      return instance[finalKey].bind(instance);
  }
  return instance ? instance[finalKey] : undefined;
}
function set_by_path(obj, path, value) {
  const keys = path.split('.');
  const final_key = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') {
      acc[key] = {};
    }
    return acc[key];
  }, obj);
  target[final_key] = value;
}
function delete_by_path(obj, path) {
  const keys = path.split('.');
  const finalKey = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  delete instance[finalKey];
}