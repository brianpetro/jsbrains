export class SmartView {
  constructor(opts={}) {
    this.opts = opts;
    this._adapter = null;
  }

  /**
   * Renders all setting components within a container.
   * @param {HTMLElement} container - The container element.
   * @param {Object} opts - Additional options for rendering.
   * @returns {Promise<void>}
   */
  async render_setting_components(container, opts={}) {
    const components = container.querySelectorAll(".setting-component");
    for (const component of components) {
      await this.render_setting_component(component, opts);
    }
  }

  /**
   * Creates a document fragment from HTML string.
   * @param {string} html - The HTML string.
   * @returns {DocumentFragment}
   */
  create_doc_fragment(html) {
    return document.createRange().createContextualFragment(html);
  }

  /**
   * Gets the adapter instance.
   * @returns {Object} The adapter instance.
   */
  get adapter() {
    if(!this._adapter) {
      this._adapter = new this.opts.adapter(this);
    }
    return this._adapter;
  }

  /**
   * Adds an icon (implemented in adapter).
   * @param {string} icon_name - The name of the icon.
   * @returns {*}
   */
  add_icon(icon_name) { return this.adapter.add_icon(icon_name); }

  /**
   * Renders a single setting component (implemented in adapter).
   * @param {HTMLElement} setting_elm - The setting element.
   * @param {Object} opts - Additional options for rendering.
   * @returns {Promise<*>}
   */
  async render_setting_component(setting_elm, opts={}) { return await this.adapter.render_setting_component(setting_elm, opts); }

  /**
   * Renders markdown content (implemented in adapter).
   * @param {string} markdown - The markdown content.
   * @returns {Promise<*>}
   */
  async render_markdown(markdown, scope=null) { return await this.adapter.render_markdown(markdown, scope); }

  /**
   * Gets a value from an object by path.
   * @param {Object} obj - The object to search in.
   * @param {string} path - The path to the value.
   * @returns {*}
   */
  get_by_path(obj, path) { return get_by_path(obj, path); }

  /**
   * Sets a value in an object by path.
   * @param {Object} obj - The object to modify.
   * @param {string} path - The path to set the value.
   * @param {*} value - The value to set.
   */
  set_by_path(obj, path, value) { set_by_path(obj, path, value); }

  /**
   * Deletes a value from an object by path.
   * @param {Object} obj - The object to modify.
   * @param {string} path - The path to delete.
   */
  delete_by_path(obj, path) { delete_by_path(obj, path); }

  /**
   * Escapes HTML special characters in a string.
   * @param {string} str - The string to escape.
   * @returns {string} The escaped string.
   */
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

  /**
   * Adds toggle listeners to elements with data-toggle attribute.
   * @param {DocumentFragment} frag - The document fragment containing toggle elements.
   * @param {Function|null} callback - Optional callback for custom toggle behavior.
   */
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

  /**
   * Renders HTML for a setting component based on its configuration.
   * @param {Object} setting_config - The configuration object for the setting.
   * @returns {string} The rendered HTML string.
   */
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

  /**
   * Validates the setting config and determines if the setting should be rendered.
   * @param {Object} scope - The scope object.
   * @param {Object} opts - The options object.
   * @param {string} setting_key - The key of the setting.
   * @param {Object} setting_config - The config of the setting.
   * @returns {boolean} True if the setting should be rendered, false otherwise.
   */
  validate_setting(scope, opts, setting_key, setting_config) {
    /**
     * if settings_keys is provided, skip setting if not in settings_keys
     */
    if (opts.settings_keys && !opts.settings_keys.includes(setting_key)) return false;
    /**
     * Conditional rendering
     * @name settings_config.conditional
     * @type {function}
     * @param {object} scope - The scope object.
     * @returns {boolean} - True if the setting should be rendered, false otherwise.
     */
    if (typeof setting_config.conditional === 'function' && !setting_config.conditional(scope)) return false;
    return true;
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