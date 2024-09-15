export class SmartView {
  constructor(env, opts={}) {
    this.env = env;
    this.opts = opts;
    this._adapter = null;
  }
  async render_settings(settings_config, opts={}) {
    const container = this.create_doc_fragment('<div></div>');
    return await Promise.all(Object.entries(settings_config).map(([setting, config]) => {
      return this.render_setting({ setting, ...config });
    }));
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
  async render_setting(setting_config) { return await this.adapter.render_setting(setting_config); }
  async render_markdown(markdown) { return await this.adapter.render_markdown(markdown); }
}