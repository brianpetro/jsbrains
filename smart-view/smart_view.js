export class SmartView {
  constructor(opts={}) {
  // constructor(main, opts={}) {
    // this.main = main;
    // this.env = this.main; // DEPRECATED: MAY NOT BE ENV
    this.opts = opts;
    this._adapter = null;
  }
  async render_setting_components(container, opts={}) {
    const components = container.querySelectorAll(".setting-component");
    // await Promise.all(Array.from(components).map(async (elm) => {
    //   await this.render_setting_component(elm);
    // }));
    // one at a time
    for (const component of components) {
      await this.render_setting_component(component, opts);
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
  async render_setting_component(setting_elm, opts={}) { return await this.adapter.render_setting_component(setting_elm, opts); }
  async render_markdown(markdown) { return await this.adapter.render_markdown(markdown); }
  get_by_path(obj, path) { return get_by_path(obj, path); }
  set_by_path(obj, path, value) { set_by_path(obj, path, value); }
  delete_by_path(obj, path) { delete_by_path(obj, path); }
  escape_html(str) {
    if(typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    ;
  }
  add_toggle_listeners(frag, callback=null) {
    frag.querySelectorAll('[data-toggle]').forEach((toggle_elm) => {
      toggle_elm.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const group = toggle_elm.dataset.toggle;
        const targets = document.querySelectorAll(`[data-group="${group}"]`);
        if(callback) callback(group, targets, toggle_elm); // custom behavior (allows persistence of state in scope)
        else targets.forEach((elm) => elm.classList.toggle('collapsed')); // default behavior
      });
    });
  }
  render_setting_html(setting_config) {
    if(setting_config.type === 'html') return setting_config.value;
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => {
        if (attr.includes('class')) return ''; // ignore class attribute
        if (typeof value === 'number') return `data-${attr.replace(/_/g, '-')}=${value}`;
        return `data-${attr.replace(/_/g, '-')}="${value}"`;
      })
      .join('\n')
    ;
    return `<div class="setting-component${setting_config.scope_class ? ` ${setting_config.scope_class}` : ''}"\ndata-setting="${setting_config.setting}"\n${attributes}\n></div>`;
  }
}


function get_by_path(obj, path) {
  if(!path) return '';
  const keys = path.split('.');
  const finalKey = keys.pop();
  const instance = keys.reduce((acc, key) => acc && acc[key], obj);
  // Check if the last key is a method and bind to the correct instance
  if (instance && typeof instance[finalKey] === 'function') {
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