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
  pre_change(path, value, elm) { console.warn("pre_change() not implemented"); }
  /**
   * Performs actions after a setting is changed, such as updating UI elements.
   * @abstract
   * @param {string} setting - The path of the setting that was changed.
   * @param {*} value - The new value for the setting.
   * @param {HTMLElement} elm - The HTML element associated with the setting.
   * @param {object} changed - Additional information about the change.
   */
  post_change(path, value, elm) { console.warn("post_change() not implemented"); }
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
      button: this.render_button_component,
      remove: this.render_remove_component,
      folder: this.render_folder_select_component,
      "text-file": this.render_file_select_component,
      file: this.render_file_select_component,
      html: this.render_html_component,
    };
  }

  async render_setting_component(elm, opts={}) {
    elm.innerHTML = "";
    const path = elm.dataset.setting;
    const scope = opts.scope || this.main.main;
    try {
      let value = elm.dataset.value ?? this.main.get_by_path(scope.settings, path);
      if (typeof value === 'undefined' && typeof elm.dataset.default !== 'undefined') {
        value = elm.dataset.default;
        if(typeof value === 'string') value = value.toLowerCase() === 'true' ? true : value === 'false' ? false : value;
        this.main.set_by_path(scope.settings, path, value);
      }

      const renderer = this.setting_renderers[elm.dataset.type];
      if (!renderer) {
        console.warn(`Unsupported setting type: ${elm.dataset.type}`);
        return elm;
      }

      const setting = renderer.call(this, elm, path, value, scope);

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
      console.error({path, elm});
      console.error(e);
    }
  }

  render_dropdown_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    let options;
    if (elm.dataset.optionsCallback) {
      console.log(`getting options callback: ${elm.dataset.optionsCallback}`);
      const opts_callback = this.main.get_by_path(scope, elm.dataset.optionsCallback);
      if(typeof opts_callback === "function") options = opts_callback();
      else console.warn(`optionsCallback is not a function: ${elm.dataset.optionsCallback}`, scope);
    }
  
    if (!options || !options.length) {
      options = this.get_dropdown_options(elm);
    }
  
    smart_setting.addDropdown(dropdown => {
      if (elm.dataset.required) dropdown.inputEl.setAttribute("required", true);
      options.forEach(option => {
        const opt = dropdown.addOption(option.value, option.name ?? option.value);
        opt.selected = (option.value === value);
      });
      dropdown.onChange((value) => {
        this.handle_on_change(path, value, elm, scope);
      });
      dropdown.setValue(value);
    });
  
    return smart_setting;
  }

  render_text_component(elm, path, value, scope) {
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
          debounceTimer = setTimeout(() => this.handle_on_change(path, value.trim(), elm, scope), 2000);
        });
      }
    });
    return smart_setting;
  }

  render_password_component(elm, path, value, scope ) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addText(text => {
      text.inputEl.type = "password";
      text.setPlaceholder(elm.dataset.placeholder || "");
      if (value) text.setValue(value);
      let debounceTimer;
      text.onChange(async (value) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, value, elm, scope), 2000);
      });
    });
    return smart_setting;
  }

  render_number_component(elm, path, value, scope) {
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
        debounceTimer = setTimeout(() => this.handle_on_change(path, parseInt(value), elm, scope), 2000);
      });
    });
    return smart_setting;
  }

  render_toggle_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addToggle(toggle => {
      let checkbox_val = value ?? true;
      if (typeof checkbox_val === 'string') {
        checkbox_val = checkbox_val.toLowerCase() === 'true';
      }
      toggle.setValue(checkbox_val);
      toggle.onChange(async (value) => this.handle_on_change(path, value, elm, scope));
    });
    return smart_setting;
  }

  render_textarea_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addTextArea(textarea => {
      textarea.setPlaceholder(elm.dataset.placeholder || "");
      textarea.setValue(value || "");
      let debounceTimer;
      textarea.onChange(async (value) => {
        value = value.split("\n").map(v => v.trim()).filter(v => v);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handle_on_change(path, value, elm, scope), 2000);
      });
    });
    return smart_setting;
  }

  render_button_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addButton(button => {
      button.setButtonText(elm.dataset.btnText || elm.dataset.name);
      button.onClick(async () => {
        if (elm.dataset.confirm && !confirm(elm.dataset.confirm)) return;
        if (elm.dataset.href) this.open_url(elm.dataset.href);
        if (elm.dataset.callback) {
          const callback = this.main.get_by_path(scope, elm.dataset.callback);
          if (callback) callback(path, value, elm, scope);
        }
      });
    });
    return smart_setting;
  }

  render_remove_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addButton(button => {
      button.setButtonText(elm.dataset.btnText || elm.dataset.name || "Remove");
      button.onClick(async () => {
        this.main.delete_by_path(scope.settings, path);
        if (elm.dataset.callback) {
          const callback = this.main.get_by_path(scope, elm.dataset.callback);
          if (callback) callback(path, value, elm, scope);
        }
      });
    });
    return smart_setting;
  }

  render_folder_select_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addFolderSelect(folder_select => {
      folder_select.setPlaceholder(elm.dataset.placeholder || "");
      if (value) folder_select.setValue(value);
      folder_select.inputEl.closest('div').addEventListener("click", () => {
        this.handle_folder_select(path, value, elm, scope);
      });
    });
    return smart_setting;
  }

  render_file_select_component(elm, path, value, scope) {
    const smart_setting = new this.setting_class(elm);
    smart_setting.addFileSelect(file_select => {
      file_select.setPlaceholder(elm.dataset.placeholder || "");
      if (value) file_select.setValue(value);
      file_select.inputEl.closest('div').addEventListener("click", () => {
        this.handle_file_select(path, value, elm, scope);
      });
    });
    return smart_setting;
  }

  render_html_component(elm, path, value, scope) {
    // render html into a div
    elm.innerHTML = value;
    return elm;
  }

  add_button_if_needed(smart_setting, elm, path, scope) {
    if (elm.dataset.btn) {
      smart_setting.addButton(button => {
        button.setButtonText(elm.dataset.btn);
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

  handle_on_change(path, value, elm, scope) {
    this.pre_change(path, value, elm, scope);
    if(elm.dataset.validate){
      const valid = this[elm.dataset.validate](path, value, elm, scope);
      if(!valid){
        elm.querySelector('.setting-item').style.border = "2px solid red";
        this.revert_setting(path, elm, scope);
        return;
      }
    }
    this.main.set_by_path(scope.settings, path, value);
    if(elm.dataset.callback){
      const callback = this.main.get_by_path(scope, elm.dataset.callback);
      if(callback) callback(path, value, elm, scope);
    }
    this.post_change(path, value, elm, scope);
  }

}