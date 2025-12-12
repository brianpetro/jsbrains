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

/**
 * Internal registry for element disposers.
 * WeakMap<HTMLElement, {
 *   dispose_fns: Set<Function>,
 *   observer: MutationObserver,
 *   has_been_in_dom: boolean,
 *   disposed: boolean
 * }>
 */
const element_disposers = new WeakMap();

/**
 * Internal registry for data-smart-setting change listeners.
 * WeakMap<HTMLElement, Function>
 */
const smart_setting_listeners = new WeakMap();

export class SmartView {
  static version = 0.1;
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
   * @param {HTMLElement|DocumentFragment} container - The container element.
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
   * @param {string} path - The path to delete the value.
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
   * @deprecated Use render_settings_config utility in Obsidian (obsidian-smart-env)
   * @param {Object} settings_config
   * @param {Object} opts
   * @param {Object} [opts.scope={}] - The scope to use when rendering settings (should have settings property).
   * @returns {Promise<DocumentFragment>}
   */
  async render_settings(settings_config, opts = {}) {
    // if (typeof settings_config === 'function') {
    //   settings_config = await settings_config(opts.scope);
    // }
    const is_fx = typeof settings_config === 'function';
    const html = Object.entries(is_fx ? await settings_config(opts.scope) : settings_config)
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
   * Scans the given container for elements that have `data-smart-setting` and attaches
   * a 'change' event listener that updates the corresponding path in `scope.settings`.
   *
   * Listener bookkeeping is done via WeakMap, not DOM attributes, to avoid
   * clone/attribute-related bugs on re-render.
   * 
   * @param {Object} scope - An object containing a `settings` property, where new values will be stored.
   * @param {HTMLElement|Document} [container=document] - The DOM element to scan. Defaults to the entire document.
   */
  add_settings_listeners(scope, container = document) {
    if (!container || typeof container.querySelectorAll !== 'function') return;

    const elements = container.querySelectorAll('[data-smart-setting]');
    
    elements.forEach(elm => {
      const path = elm.dataset.smartSetting;
      if (!path) return;

      // Deduplicate per element without using attributes
      if (smart_setting_listeners.has(elm)) {
        return;
      }

      const handler = () => {
        let new_value;

        if (elm instanceof HTMLInputElement) {
          if (elm.type === 'checkbox') {
            new_value = elm.checked;
          } else if (elm.type === 'radio') {
            if (elm.checked) {
              new_value = elm.value;
            } else {
              return;
            }
          } else {
            new_value = elm.value;
          }
        } else if (elm instanceof HTMLSelectElement || elm instanceof HTMLTextAreaElement) {
          new_value = elm.value;
        } else {
          new_value = elm.value ?? elm.textContent;
        }

        this.set_by_path(scope.settings, path, new_value);
      };

      smart_setting_listeners.set(elm, handler);
      elm.addEventListener('change', handler);

      // Ensure the listener is cleaned up when the element leaves the DOM.
      if (elm instanceof HTMLElement) {
        this.attach_disposer(elm, () => {
          const existing = smart_setting_listeners.get(elm);
          if (existing) {
            elm.removeEventListener('change', existing);
            smart_setting_listeners.delete(elm);
          }
        });
      }
    });
  }

  apply_style_sheet(sheet) {
    // handle both string and CSSStyleSheet
    if (typeof sheet === 'string') {
      const css_hash = murmur_hash_32_alphanumeric(sheet);
      if (document.getElementById(`style-sheet-${css_hash}`)) {
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

  empty(elm) {
    empty(elm);
  }

  safe_inner_html(elm, html) {
    safe_inner_html(elm, html);
  }
  
  /**
   * Attaches one or more disposer functions to an element that will be called
   * when that element has been observed in the DOM and is later removed.
   *
   * - Multiple calls for the same element accumulate disposer functions.
   * - Disposers are only invoked once, on the first removal after the
   *   element has been in the DOM.
   * - No DOM attributes or properties are used for bookkeeping; everything
   *   is tracked via WeakMap.
   *
   * @param {HTMLElement} el - The element to monitor.
   * @param {Function|Function[]} dispose - The disposer function or array of functions to call on removal.
   */
  attach_disposer(el, dispose) {
    if (!el) return;

    const doc = el.ownerDocument;
    const win = doc && doc.defaultView;
    const MutationObserverCtor = win && win.MutationObserver;
    if (!doc || !win || !MutationObserverCtor || !doc.body) return;

    let dispose_fns;
    if (typeof dispose === 'function') {
      dispose_fns = [dispose];
    } else if (Array.isArray(dispose)) {
      dispose_fns = dispose.filter(fn => typeof fn === 'function');
    } else {
      console.warn('[smart-view] attach_disposer called with invalid disposer');
      return;
    }

    if (!dispose_fns.length) {
      console.warn('[smart-view] attach_disposer called with no valid disposer functions');
      return;
    }

    let entry = element_disposers.get(el);
    if (!entry) {
      entry = {
        dispose_fns: new Set(),
        observer: null,
        has_been_in_dom: false,
        disposed: false
      };
      element_disposers.set(el, entry);
    }

    if (entry.disposed) {
      // Treat as a fresh lifecycle for this element.
      entry.disposed = false;
      entry.has_been_in_dom = false;
    }

    for (const fn of dispose_fns) {
      entry.dispose_fns.add(fn);
    }

    if (!entry.observer) {
      const observer = new MutationObserverCtor(() => {
        // Track lifecycle of this specific element.
        const in_dom = doc.body.contains(el);

        if (in_dom) {
          entry.has_been_in_dom = true;
          return;
        }

        // If element has never been in the DOM, ignore "removals".
        if (!entry.has_been_in_dom || entry.disposed) {
          return;
        }

        entry.disposed = true;
        try {
          for (const fn of entry.dispose_fns) {
            try {
              fn();
            } catch (err) {
              console.error('[smart-view] disposer error', err);
            }
          }
        } finally {
          try {
            observer.disconnect();
          } catch (e) {
            // noop
          }
          if (element_disposers.get(el) === entry) {
            element_disposers.delete(el);
          }
        }
      });

      entry.observer = observer;
      observer.observe(doc.body, { childList: true, subtree: true });
    }
  }
}
