import { empty } from '../utils/empty.js';
import { safe_inner_html } from '../utils/safe_inner_html.js';
export class SmartViewAdapter {
  constructor(main) {
    this.main = main;
  }
  // NECESSARY OVERRIDES
  /**
   * Retrieves the class used for settings.
   * Must be overridden by subclasses to return the appropriate setting class.
   * @abstract
   * @returns {Function} The setting class constructor.
   * @throws Will throw an error if not implemented in the subclass.
   */
  get setting_class() { throw new Error("setting_class() not implemented"); }
  /**
   * Generates the HTML for a specified icon.
   * Must be overridden by subclasses to provide the correct icon HTML.
   * @abstract
   * @param {string} icon_name - The name of the icon to generate HTML for.
   * @returns {string} The HTML string representing the icon.
   * @throws Will throw an error if not implemented in the subclass.
   */
  get_icon_html(icon_name) { throw new Error("get_icon_html() not implemented"); }
  /**
   * Renders Markdown content within a specific scope.
   * Must be overridden by subclasses to handle Markdown rendering appropriately.
   * @abstract
   * @param {string} markdown - The Markdown content to render.
   * @param {object|null} [scope=null] - The scope within which to render the Markdown.
   * @returns {Promise<void>} A promise that resolves when rendering is complete.
   * @throws Will throw an error if not implemented in the subclass.
   */
  async render_markdown(markdown, scope=null) { throw new Error("render_markdown() not implemented"); }
  /**
   * Opens a specified URL.
   * Should be overridden by subclasses to define how URLs are opened.
   * @abstract
   * @param {string} url - The URL to open.
   */
  open_url(url) { throw new Error("open_url() not implemented"); }
  /**
   * Handles the selection of a folder by invoking the folder selection dialog and updating the setting.
   * @abstract
   * @param {string} setting - The path of the setting being modified.
   * @param {string} value - The current value of the setting.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} scope - The current scope containing settings and actions.
   */
  handle_folder_select(path, value, elm, scope) { throw new Error("handle_folder_select not implemented"); }
  /**
   * Handles the selection of a file by invoking the file selection dialog and updating the setting.
   * @abstract
   * @param {string} setting - The path of the setting being modified.
   * @param {string} value - The current value of the setting.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} scope - The current scope containing settings and actions.
   */
  handle_file_select(path, value, elm, scope) { throw new Error("handle_file_select not implemented"); }
  /**
   * Performs actions before a setting is changed, such as clearing notices and updating the UI.
   * @abstract
   * @param {string} setting - The path of the setting being changed.
   * @param {*} value - The new value for the setting.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} scope - The current scope containing settings and actions.
   */
  pre_change(path, value, elm) {
    // console.warn("pre_change() not implemented");
  }
  /**
   * Performs actions after a setting is changed, such as updating UI elements.
   * @abstract
   * @param {string} setting - The path of the setting that was changed.
   * @param {*} value - The new value for the setting.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} changed - Additional information about the change.
   */
  post_change(path, value, elm) {
    // console.warn("post_change() not implemented");
  }
  /**
   * Reverts a setting to its previous value in case of validation failure or error.
   * @abstract
   * @param {string} setting - The path of the setting to revert.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} scope - The current scope containing settings.
   */
  revert_setting(path, elm, scope) { console.warn("revert_setting() not implemented"); }
  // DEFAULT IMPLEMENTATIONS (may be overridden)
  get setting_renderers() {
    return {
      text: this.render_text_component,
      string: this.render_text_component,
      password: this.render_password_component,
      number: this.render_number_component,
      dropdown: this.render_dropdown_component,
      toggle: this.render_toggle_component,
      textarea: this.render_textarea_component,
      textarea_array: this.render_textarea_array_component,
      button: this.render_button_component,
      remove: this.render_remove_component,
      folder: this.render_folder_select_component,
      "text-file": this.render_file_select_component,
      file: this.render_file_select_component,
      slider: this.render_slider_component,
      html: this.render_html_component,
      button_with_confirm: this.render_button_with_confirm_component,
      json: this.render_json_component,
      array: this.render_array_component,
    };
  }

  async render_setting_component(elm, opts={}) {
    this.empty(elm);
    const path = elm.dataset.setting;
    const scope = opts.scope || this.main.main;
    const settings_scope = opts.settings_scope || null;
    try {
      let value = elm.dataset.value ?? this.main.get_by_path(scope.settings, path, settings_scope);
      // REMOVE THIS: Bad behavior (doesn't use defaults until settings is opened; should be handled by smart_env_config.default_settings)
      if (typeof value === 'undefined' && typeof elm.dataset.default !== 'undefined') {
        value = elm.dataset.default;
        if(typeof value === 'string') value = value.toLowerCase() === 'true' ? true : value === 'false' ? false : value;
        this.main.set_by_path(scope.settings, path, value, settings_scope);
      }

      const renderer = this.setting_renderers[elm.dataset.type];
      if (!renderer) {
        console.warn(`Unsupported setting type: ${elm.dataset.type}`);
        return elm;
      }

      const setting = renderer.call(this, elm, path, value, scope, settings_scope);

      if (elm.dataset.name) setting.setName(elm.dataset.name);
      if (elm.dataset.description) {
        const frag = this.main.create_doc_fragment(`<span>${elm.dataset.description}</span>`);
        setting.setDesc(frag);
      }
      if (elm.dataset.tooltip) setting.setTooltip(elm.dataset.tooltip);

      this.add_button_if_needed(setting, elm, path, scope);
      this.handle_disabled_and_hidden(elm);
      return elm;
    } catch(e) {
      console.error(JSON.stringify({path, elm}, null, 2));
      console.error(JSON.stringify(e, null, 2));
    }
  }

  render_dropdown_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    let options;
    smart_setting.addDropdown(dropdown => {
      if (elm.dataset.required) dropdown.selectEl.setAttribute("required", true);
      const opts_callback = elm.dataset.optionsCallback ? this.main.get_by_path(scope, elm.dataset.optionsCallback) : null;
      if (typeof opts_callback === "function") {
        console.log(`getting options callback: ${elm.dataset.optionsCallback}`);
        Promise.resolve(opts_callback()).then(opts => {
          opts.forEach(option => {
            const opt = dropdown.addOption(option.value, option.label ?? option.name ?? option.value);
            opt.selected = (option.value === value);
            if(opts.length === 1 && opt.selected) dropdown.selectEl.classList.add("dropdown-no-options"); // hide if one option and is selected
          });
          dropdown.setValue(value);
        });
      } else {
        if (!options || !options.length) {
          options = this.get_dropdown_options(elm);
        }
        options.forEach(option => {
          const opt = dropdown.addOption(option.value, option.label ?? option.name ?? option.value);
          opt.selected = (option.value === value);
          if(options.length === 1 && opt.selected) dropdown.selectEl.classList.add("dropdown-no-options"); // hide if one option and is selected
        });
        dropdown.setValue(value);
      }
      dropdown.onChange((value) => {
        this.handle_on_change(path, value, elm, scope, settings_scope);
      });
    });
  
  
    return smart_setting;
  }

  render_text_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addText(text => {
      text.setPlaceholder(elm.dataset.placeholder || "");
      if (value) text.setValue(value);
      let debounceTimer;
      if (elm.dataset.button) {
        smart_setting.addButton(button => {
          button.setButtonText(elm.dataset.button);
          button.onClick(async () => this.handle_on_change(path, text.getValue(), elm, scope));
        });
      } else {
        text.onChange(async (value) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => this.handle_on_change(path, value.trim(), elm, scope, settings_scope), 2000);
        });
      }
    });
    return smart_setting;
  }

  render_password_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addText(text => {
      text.inputEl.type = "password";
      text.setPlaceholder(elm.dataset.placeholder || "");
      if (value) text.setValue(value);
      let debounceTimer;
      text.onChange(async (value) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, value, elm, scope, settings_scope), 2000);
      });
    });
    return smart_setting;
  }

  render_number_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addText(number => {
      number.inputEl.type = "number";
      number.setPlaceholder(elm.dataset.placeholder || "");
      if (typeof value !== 'undefined') number.inputEl.value = parseInt(value);
      number.inputEl.min = elm.dataset.min || 0;
      if (elm.dataset.max) number.inputEl.max = elm.dataset.max;
      let debounceTimer;
      number.onChange(async (value) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, parseInt(value), elm, scope, settings_scope), 2000);
      });
    });
    return smart_setting;
  }

  render_toggle_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addToggle(toggle => {
      let checkbox_val = value ?? false;
      if (typeof checkbox_val === 'string') {
        checkbox_val = checkbox_val.toLowerCase() === 'true';
      }
      toggle.setValue(checkbox_val);
      toggle.onChange(async (value) => this.handle_on_change(path, value, elm, scope, settings_scope));
    });
    return smart_setting;
  }

  render_textarea_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addTextArea(textarea => {
      textarea.setPlaceholder(elm.dataset.placeholder || "");
      textarea.setValue(value || "");
      let debounceTimer;
      textarea.onChange(async (value) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, value, elm, scope, settings_scope), 2000);
      });
    });
    return smart_setting;
  }
  render_textarea_array_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addTextArea(textarea => {
      textarea.setPlaceholder(elm.dataset.placeholder || "");
      textarea.setValue(Array.isArray(value) ? value.join("\n") : value || "");
      let debounceTimer;
      textarea.onChange(async (value) => {
        value = value.split("\n").map(v => v.trim()).filter(v => v);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, value, elm, scope, settings_scope), 2000);
      });
    });
    return smart_setting;
  }

  render_button_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addButton(button => {
      button.setButtonText(elm.dataset.btnText || elm.dataset.name);
      button.onClick(async () => {
        if (elm.dataset.confirm && !confirm(elm.dataset.confirm)) return;
        if (elm.dataset.href) this.open_url(elm.dataset.href);
        if (elm.dataset.callback) {
          const callback = this.main.get_by_path(scope, elm.dataset.callback);
          if (callback) callback(path, value, elm, scope, settings_scope);
        }
      });
    });
    return smart_setting;
  }

  render_remove_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addButton(button => {
      button.setButtonText(elm.dataset.btnText || elm.dataset.name || "Remove");
      button.onClick(async () => {
        this.main.delete_by_path(scope.settings, path, settings_scope);
        if (elm.dataset.callback) {
          const callback = this.main.get_by_path(scope, elm.dataset.callback);
          if (callback) callback(path, value, elm, scope, settings_scope);
        }
      });
    });
    return smart_setting;
  }

  render_folder_select_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addFolderSelect(folder_select => {
      folder_select.setPlaceholder(elm.dataset.placeholder || "");
      if (value) folder_select.setValue(value);
      folder_select.inputEl.closest('div').addEventListener("click", () => {
        this.handle_folder_select(path, value, elm, scope);
      });
      folder_select.inputEl.querySelector('input').addEventListener('change', (e) => {
        const folder = e.target.value;
        this.handle_on_change(path, folder, elm, scope, settings_scope);
      });
    });
    return smart_setting;
  }

  render_file_select_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addFileSelect(file_select => {
      file_select.setPlaceholder(elm.dataset.placeholder || "");
      if (value) file_select.setValue(value);
      file_select.inputEl.closest('div').addEventListener("click", () => {
        this.handle_file_select(path, value, elm, scope, settings_scope);
      });
    });
    return smart_setting;
  }

  render_slider_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addSlider(slider => {
      const min = parseFloat(elm.dataset.min) || 0;
      const max = parseFloat(elm.dataset.max) || 100;
      const step = parseFloat(elm.dataset.step) || 1;
      const currentValue = (typeof value !== 'undefined') ? parseFloat(value) : min;
      slider.setLimits(min, max, step);
      slider.setValue(currentValue);
      slider.onChange(newVal => {
        const numericVal = parseFloat(newVal);
        this.handle_on_change(path, numericVal, elm, scope, settings_scope);
      });
    });
    return smart_setting;
  }

  render_html_component(elm, path, value, scope) {
    // render html into a div
    this.safe_inner_html(elm, value);
    return elm;
  }

  /**
   * Renders an array setting component for managing a list of strings.
   * @param {HTMLElement} elm - Container element for the setting.
   * @param {string} path - Dot-notation path to store the array.
   * @param {Array<string>} value - Initial array value.
   * @param {object} scope - Scope containing settings and actions.
   * @param {object|null} settings_scope - Optional nested settings scope.
   * @returns {object} smart_setting instance.
   */
  render_array_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    let arr = Array.isArray(value) ? [...value] : [];

    const items_container = document.createElement('div');
    items_container.className = 'array-items-container';
    // items_container.style.display = 'flex';
    // items_container.style.flexDirection = 'column';
    // items_container.style.gap = '0px';

    const render_items = () => {
      items_container.innerHTML = '';
      arr.forEach((val, idx) => {
        const row = document.createElement('div');
        row.className = 'array-item-row';
        // row.style.display = 'flex';
        // row.style.flexDirection = 'row';
        // row.style.gap = '4px';
        // row.style.marginBottom = '4px';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        input.placeholder = 'Value';
        // input.style.flex = '1';

        const remove_btn = document.createElement('button');
        remove_btn.textContent = '✕';
        remove_btn.title = 'Remove';
        // remove_btn.style.flex = 'none';

        input.addEventListener('change', () => {
          arr[idx] = input.value;
          trigger_change();
        });
        remove_btn.addEventListener('click', () => {
          arr.splice(idx, 1);
          render_items();
          trigger_change();
        });

        row.appendChild(input);
        row.appendChild(remove_btn);
        items_container.appendChild(row);
      });
    };

    const add_row = document.createElement('div');
    add_row.className = 'array-add-row';
    // add_row.style.display = 'flex';
    // add_row.style.gap = '4px';
    // add_row.style.marginTop = '8px';

    const new_input = document.createElement('input');
    new_input.type = 'text';
    new_input.placeholder = 'Value';
    // new_input.style.flex = '1';

    const add_btn = document.createElement('button');
    add_btn.textContent = '+';
    add_btn.title = 'Add value';
    // add_btn.style.flex = 'none';

    add_btn.addEventListener('click', () => {
      const v = new_input.value.trim();
      if (!v) return;
      arr.push(v);
      new_input.value = '';
      render_items();
      trigger_change();
    });

    add_row.appendChild(new_input);
    add_row.appendChild(add_btn);

    smart_setting.controlEl.appendChild(items_container);
    smart_setting.controlEl.appendChild(add_row);
    // smart_setting.controlEl.style.flexDirection = 'column';

    const trigger_change = () => {
      this.handle_on_change(path, [...arr], elm, scope, settings_scope);
    };

    render_items();
    elm.appendChild(smart_setting.settingEl);
    return smart_setting;
  }

  render_json_component(elm, path, value, scope, settings_scope) {
    try {
      const smart_setting = new this.setting_class(elm);
      // Ensure value is an object
      let obj = (typeof value === "object" && value !== null) ? { ...value } : {};
  
      // Container for pairs
      const pairs_container = document.createElement('div');
      pairs_container.className = 'json-pairs-container';
      // pairs_container.style.display = 'flex';
      // pairs_container.style.flexDirection = 'column';
      // pairs_container.style.gap = '0px'; // No gap, use margin for rows
  
      // Helper to render all pairs
      const renderPairs = () => {
        // Clear previous
        pairs_container.innerHTML = '';
        Object.entries(obj).forEach(([key, val], idx) => {
          const pair_div = document.createElement('div');
          pair_div.className = 'json-pair-row';
          // pair_div.style.display = 'flex';
          // pair_div.style.flexDirection = 'row';
          // pair_div.style.gap = '4px';
          // pair_div.style.marginBottom = '4px'; // Each pair on its own line
  
          // Property input
          const key_i = document.createElement('input');
          key_i.type = 'text';
          key_i.value = key;
          key_i.placeholder = 'Property';
          // key_i.style.flex = '1';
          // Value input
          const value_i = document.createElement('input');
          value_i.type = 'text';
          value_i.value = val;
          value_i.placeholder = 'Value';
          // value_i.style.flex = '1';
          // Remove button
          const remove_btn = document.createElement('button');
          remove_btn.textContent = '✕';
          remove_btn.title = 'Remove';
          // remove_btn.style.flex = 'none';
  
          // Handlers
          key_i.addEventListener('change', () => {
            const newKey = key_i.value.trim();
            if (!newKey) return;
            if (newKey !== key) {
              // Rename property
              obj[newKey] = obj[key];
              delete obj[key];
              renderPairs();
              triggerChange();
            }
          });
          value_i.addEventListener('change', () => {
            obj[key_i.value] = value_i.value;
            triggerChange();
          });
          remove_btn.addEventListener('click', () => {
            delete obj[key_i.value];
            renderPairs();
            triggerChange();
          });
  
          pair_div.appendChild(key_i);
          pair_div.appendChild(value_i);
          pair_div.appendChild(remove_btn);
          pairs_container.appendChild(pair_div);
        });
      };
  
      // Add new pair row
      const add_div = document.createElement('div');
      add_div.className = 'json-add-row';
      // add_div.style.display = 'flex';
      // add_div.style.gap = '4px';
      // add_div.style.marginTop = '8px'; // Space above add row
      const new_key_i = document.createElement('input');
      new_key_i.type = 'text';
      new_key_i.placeholder = 'Property';
      // new_key_i.style.flex = '1';
      const new_val_i = document.createElement('input');
      new_val_i.type = 'text';
      new_val_i.placeholder = 'Value';
      // new_val_i.style.flex = '1';
      const add_btn = document.createElement('button');
      add_btn.textContent = '+';
      add_btn.title = 'Add property';
      // add_btn.style.flex = 'none';
  
      add_btn.addEventListener('click', () => {
        const k = new_key_i.value.trim();
        if (!k || k in obj) return;
        obj[k] = new_val_i.value;
        new_key_i.value = '';
        new_val_i.value = '';
        renderPairs();
        triggerChange();
      });
  
      add_div.appendChild(new_key_i);
      add_div.appendChild(new_val_i);
      add_div.appendChild(add_btn);
  
      // Append to setting element
      smart_setting.controlEl.appendChild(pairs_container);
      smart_setting.controlEl.appendChild(add_div);
      // smart_setting.controlEl.style.flexDirection = 'column';

      // Change handler
      const triggerChange = () => {
        this.handle_on_change(path, { ...obj }, elm, scope, settings_scope);
      };
  
      renderPairs();

      elm.appendChild(smart_setting.settingEl);
      return smart_setting;
    }catch(e) {
      console.error(e)
    }
  }

  add_button_if_needed(smart_setting, elm, path, scope) {
    if (elm.dataset.btn) {
      smart_setting.addButton(button => {
        button.setButtonText(elm.dataset.btn);
        if(elm.dataset.btnCallback || elm.dataset.btnHref || elm.dataset.callback || elm.dataset.href) {
          button.inputEl.addEventListener("click", (e) => {
            if (elm.dataset.btnCallback && typeof scope[elm.dataset.btnCallback] === "function") {
              if(elm.dataset.btnCallbackArg) scope[elm.dataset.btnCallback](elm.dataset.btnCallbackArg);
              else scope[elm.dataset.btnCallback](path, null, smart_setting, scope);
            } else if (elm.dataset.btnHref) {
              this.open_url(elm.dataset.btnHref);
            } else if (elm.dataset.callback && typeof this.main.get_by_path(scope, elm.dataset.callback) === "function") {
              this.main.get_by_path(scope, elm.dataset.callback)(path, null, smart_setting, scope);
            } else if (elm.dataset.href) {
              this.open_url(elm.dataset.href);
            } else {
              console.error("No callback or href found for button.");
            }
          });
        }
        if (elm.dataset.btnDisabled || (elm.dataset.disabled && elm.dataset.btnDisabled !== "false")) {
          button.inputEl.disabled = true;
        }
      });
    }
  }

  handle_disabled_and_hidden(elm) {
    if (elm.dataset.disabled && elm.dataset.disabled !== "false") {
      elm.classList.add("disabled");
      elm.querySelector("input, select, textarea, button").disabled = true;
    }
    if (elm.dataset.hidden && elm.dataset.hidden !== "false") {
      elm.style.display = "none";
    }
  }

  get_dropdown_options(elm) {
    return Object.entries(elm.dataset).reduce((acc, [k, v]) => {
      if (!k.startsWith('option')) return acc;
      const [value, name] = v.split("|");
      acc.push({ value, name: name || value });
      return acc;
    }, []);
  }

  handle_on_change(path, value, elm, scope, settings_scope) {
    this.pre_change(path, value, elm, scope);
    if(elm.dataset.validate){
      const valid = this[elm.dataset.validate](path, value, elm, scope);
      if(!valid){
        elm.querySelector('.setting-item').style.border = "2px solid red";
        this.revert_setting(path, elm, scope);
        return;
      }
    }
    this.main.set_by_path(scope.settings, path, value, settings_scope);
    if(elm.dataset.callback){
      const callback = this.main.get_by_path(scope, elm.dataset.callback);
      if(callback) callback(path, value, elm, scope);
    }
    this.post_change(path, value, elm, scope);
  }

  render_button_with_confirm_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addButton(button => {
      button.setButtonText(elm.dataset.btnText || elm.dataset.name);
      elm.appendChild(this.main.create_doc_fragment(`
        <div class="sc-inline-confirm-row" style="
          display: none;
        ">
          <span style="margin-right: 10px;">
            ${elm.dataset.confirm || "Are you sure?"}
          </span>
          <span class="sc-inline-confirm-row-buttons">
            <button class="sc-inline-confirm-yes">Yes</button>
            <button class="sc-inline-confirm-cancel">Cancel</button>
          </span>
        </div>
      `));
      const confirm_row = elm.querySelector('.sc-inline-confirm-row');
      const confirm_yes = confirm_row.querySelector('.sc-inline-confirm-yes');
      const confirm_cancel = confirm_row.querySelector('.sc-inline-confirm-cancel');

      button.onClick(async () => {
        confirm_row.style.display = 'block';
        elm.querySelector('.setting-item').style.display = 'none';
      });
      confirm_yes.addEventListener('click', async () => {
        if (elm.dataset.href) this.open_url(elm.dataset.href);
        if (elm.dataset.callback) {
          const callback = this.main.get_by_path(scope, elm.dataset.callback);
          if (callback) callback(path, value, elm, scope);
        }
        elm.querySelector('.setting-item').style.display = 'block';
        confirm_row.style.display = 'none';
      });
      confirm_cancel.addEventListener('click', () => {
        confirm_row.style.display = 'none';
        elm.querySelector('.setting-item').style.display = 'block';
      });
    });
    return smart_setting;
  }
  empty(elm){
    empty(elm);
  }
  safe_inner_html(elm, html){
    safe_inner_html(elm, html);
  }
}