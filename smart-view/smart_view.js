/**
 * @file smart_view.js
 * @description
 * Provides a high-level interface (SmartView) for rendering settings components and other UI 
 * in a modular, adapter-based pattern. This version includes add_settings_listeners for 
 * automatically binding data-smart-setting inputs to scope.settings.
 */

import { empty } from './utils/empty.js';
import { safe_inner_html } from './utils/safe_inner_html.js';

import {
  escape_html as util_escape_html,
  get_by_path as util_get_by_path,
  set_by_path as util_set_by_path,
  delete_by_path as util_delete_by_path
} from 'smart-utils';
import { murmur_hash_32_alphanumeric } from 'smart-utils/create_hash.js';
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
    const promises = [];
    for (const component of components) {
      promises.push(this.render_setting_component(component, opts));
    }
    await Promise.all(promises);
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
      // By default, we rely on whatever adapter was set in `this.opts.adapter`.
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
  get_by_path(obj, path, settings_scope = null) {
    return util_get_by_path(obj, path, settings_scope);
  }

  /**
   * Sets a value in an object by path.
   * @param {Object} obj - The object to modify.
   * @param {string} path - The path to set the value.
   * @param {*} value - The value to set.
   */
  set_by_path(obj, path, value, settings_scope = null) {
    util_set_by_path(obj, path, value, settings_scope);
  }

  /**
   * Deletes a value from an object by path.
   * @param {Object} obj - The object to modify.
   * @param {string} path - The path to delete.
   */
  delete_by_path(obj, path, settings_scope = null) {
    util_delete_by_path(obj, path, settings_scope);
  }

  /**
   * Escapes HTML special characters in a string.
   * @param {string} str - The string to escape.
   * @returns {string} The escaped string.
   */
  escape_html(str) {
    return util_escape_html(str);
  }

  /**
   * A convenience method to build a setting HTML snippet from a config object.
   * @param {Object} setting_config
   * @returns {string}
   */
  render_setting_html(setting_config) {
    if (setting_config.type === 'html') {
      // If the user wants to render raw HTML
      return setting_config.value;
    }
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => {
        if (attr.includes('class')) return '';
        if (typeof value === 'number') return `data-${attr.replace(/_/g, '-') }=${value}`;
        return `data-${attr.replace(/_/g, '-') }="${value}"`;
      })
      .join('\n')
    ;
    return `<div class="setting-component${setting_config.scope_class ? ' ' + setting_config.scope_class : ''}"\n` +
      `data-setting="${setting_config.setting}"\n` +
      `${attributes}\n></div>`;
  }

  /**
   * Renders settings from a config, returning a fragment.
   * @async
   * @param {Object} settings_config
   * @param {Object} opts
   * @returns {Promise<DocumentFragment>}
   */
  async render_settings(settings_config, opts = {}) {
    const html = Object.entries(settings_config)
      .map(([setting_key, setting_config]) => {
        if (!setting_config.setting) {
          setting_config.setting = setting_key;
        }
        return this.render_setting_html(setting_config);
      })
      .join('\n');
    const frag = this.create_doc_fragment(`<div>${html}</div>`);
    return await this.render_setting_components(frag, opts);
  }

  /**
   * @function add_settings_listeners
   * @description
   * Scans the given container for elements that have `data-smart-setting` and attaches
   * a 'change' event listener. On change, it updates the corresponding path in `scope.settings`.
   * 
   * @param {Object} scope - An object containing a `settings` property, where new values will be stored.
   * @param {HTMLElement} [container=document] - The DOM element to scan. Defaults to the entire document.
   */
  add_settings_listeners(scope, container = document) {
    const elements = container.querySelectorAll('[data-smart-setting]');
    
    elements.forEach(elm => {
      const path = elm.dataset.smartSetting;
      if (!path) return;

      // Attach one listener if not already attached:
      if (!elm.dataset.listenerAttached) {
        elm.dataset.listenerAttached = 'true';
        elm.addEventListener('change', () => {
          let newValue;
          
          // Determine element type
          if (elm instanceof HTMLInputElement) {
            if (elm.type === 'checkbox') {
              newValue = elm.checked;
            } else if (elm.type === 'radio') {
              if (elm.checked) {
                newValue = elm.value;
              } else {
                // If not checked, we do not change the setting
                // unless we want to unset it. Skipping is safer.
                return;
              }
            } else {
              newValue = elm.value;
            }
          } else if (elm instanceof HTMLSelectElement || elm instanceof HTMLTextAreaElement) {
            newValue = elm.value;
          } else {
            // Fallback for other elements
            newValue = elm.value ?? elm.textContent;
          }

          this.set_by_path(scope.settings, path, newValue);
        });
      }
    });
  }
  apply_style_sheet(sheet) {
    // handle both string and CSSStyleSheet
    if(typeof sheet === 'string') {
      const css_hash = murmur_hash_32_alphanumeric(sheet);
      if(document.getElementById(`style-sheet-${css_hash}`)) {
        // Already applied
        return;
      }
      // Create a new CSSStyleSheet
      const styleEl = document.createElement('style');
      styleEl.id = `style-sheet-${css_hash}`;
      styleEl.textContent = sheet;
      document.head.appendChild(styleEl);
      return;
    }
    if ('adoptedStyleSheets' in Document.prototype) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } else {
      // Fallback: Create a <style> tag and insert the CSS text.
      const styleEl = document.createElement('style');
      // If the sheet has cssRules, serialize them to text:
      if (sheet.cssRules) {
        styleEl.textContent = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
      }
      document.head.appendChild(styleEl);
    }
  }
  empty(elm){
    empty(elm);
  }
  safe_inner_html(elm, html){
    safe_inner_html(elm, html);
  }
}
