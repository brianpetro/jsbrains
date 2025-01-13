/**
 * @file smart_view.js
 * @description
 * Provides a high-level interface (SmartView) for rendering settings components and other UI in a modular, adapter-based pattern.
 * This version includes an inline confirm method for "clear all" (or any destructive) actions.
 */

export class SmartView {
  /**
   * @constructor
   * @param {object} opts - Additional options or overrides for rendering.
   */
  constructor(opts = {}) {
    this.opts = opts;
    this._adapter = null;
  }

  /**
   * Renders all setting components within a container.
   * @async
   * @param {HTMLElement} container - The container element.
   * @param {Object} opts - Additional options for rendering.
   * @returns {Promise<void>}
   */
  async render_setting_components(container, opts = {}) {
    const components = container.querySelectorAll(".setting-component");
    for (const component of components) {
      await this.render_setting_component(component, opts);
    }
    return container;
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
   * Gets the adapter instance used for rendering (e.g., Obsidian or Node, etc.).
   * @returns {Object} The adapter instance.
   */
  get adapter() {
    if (!this._adapter) {
      // By default, we rely on whatever adapter was set in `this.opts.adapter`
      // If none, throw or fallback to a minimal adapter
      if (!this.opts.adapter) {
        throw new Error("No adapter provided to SmartView. Provide a 'smart_view.adapter' in env config.");
      }
      const AdapterClass = this.opts.adapter;
      this._adapter = new AdapterClass(this);
    }
    return this._adapter;
  }

  /**
   * Gets an icon (implemented in the adapter).
   * @param {string} icon_name - Name of the icon to get.
   * @returns {string} The icon HTML string.
   */
  get_icon_html(icon_name) {
    return this.adapter.get_icon_html(icon_name);
  }

  /**
   * Renders a single setting component (implemented in adapter).
   * @async
   * @param {HTMLElement} setting_elm - The DOM element for the setting.
   * @param {Object} opts - Additional options for rendering.
   * @returns {Promise<*>}
   */
  async render_setting_component(setting_elm, opts = {}) {
    return await this.adapter.render_setting_component(setting_elm, opts);
  }

  /**
   * Renders markdown content (implemented in adapter).
   * @param {string} markdown - The markdown content.
   * @param {object|null} scope - The scope to pass for rendering.
   * @returns {Promise<DocumentFragment>}
   */
  async render_markdown(markdown, scope = null) {
    return await this.adapter.render_markdown(markdown, scope);
  }

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
   * A convenience method to build a setting HTML snippet from a config object.
   * @param {Object} setting_config
   * @returns {string}
   */
  render_setting_html(setting_config) {
    // Implementation detail: produce <div class="setting-component" data-...> from config
    if (setting_config.type === 'html') {
      // If the user wants to render raw HTML
      return setting_config.value;
    }
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => {
        if (attr.includes('class')) return ''; // ignore class attribute
        if (typeof value === 'number') return `data-${attr.replace(/_/g, '-') }=${value}`;
        return `data-${attr.replace(/_/g, '-') }="${value}"`;
      })
      .join("\n");
    return `<div class="setting-component${setting_config.scope_class ? ` ${setting_config.scope_class}` : ''}"\ndata-setting="${setting_config.setting}"\n${attributes}\n></div>`;
  }

  /**
   * Validates a setting config. Modify if you have advanced logic (like gating).
   * @param {Object} scope - The scope object.
   * @param {Object} opts - Additional options.
   * @param {string} setting_key - The key of the setting.
   * @param {Object} setting_config - The config for the setting.
   * @returns {boolean} True if valid.
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

  /**
   * Handles the smooth transition effect when opening overlays.
   * @param {HTMLElement} overlay_container - The overlay container element.
   */
  on_open_overlay(overlay_container) {
    overlay_container.style.transition = "background-color 0.5s ease-in-out";
    overlay_container.style.backgroundColor = "var(--bold-color)";
    setTimeout(() => { overlay_container.style.backgroundColor = ""; }, 500);
  }
  /**
   * Renders settings from a config, returning a fragment.
   * @async
   * @param {Object} settings_config
   * @param {Object} opts
   * @returns {Promise<DocumentFragment>}
   */
  async render_settings(settings_config, opts = {}) {
    const scope = opts.scope || {};
    const html = Object.entries(settings_config)
      .map(([setting_key, setting_config]) => {
        if (!setting_config.setting) {
          setting_config.setting = setting_key;
        }
        if (this.validate_setting(scope, opts, setting_key, setting_config)) {
          return this.render_setting_html(setting_config);
        }
        return '';
      })
      .join('\n');
    const frag = this.create_doc_fragment(`<div>${html}</div>`);
    return await this.render_setting_components(frag, opts);
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