import { SmartViewAdapter } from "./_adapter.js";

export class SmartViewNodeAdapter extends SmartViewAdapter {
  get setting_class() { return Setting; }

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
      const opts_callback = this.main.get_by_path(scope, elm.dataset.optionsCallback);
      if(typeof opts_callback === "function") options = opts_callback();
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
      text.onChange(async (value) => this.handle_on_change(path, value, elm, scope));
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
      number.onChange(async (value) => this.handle_on_change(path, parseInt(value), elm, scope));
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
      textarea.onChange(async (value) => {
        value = value.split("\n").map(v => v.trim()).filter(v => v).join("\n");
        this.handle_on_change(path, value, elm, scope);
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
          if (elm.dataset.btnCallback && typeof this[elm.dataset.btnCallback] === "function") {
            this[elm.dataset.btnCallback](path, null, smart_setting, scope);
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

  pre_change(path, value, elm) { /* override in subclass */ }
  post_change(path, value, elm) { /* override in subclass */ }
  revert_setting(path, elm, scope) { /* override in subclass */ }
  open_url(url) { /* override in subclass */ }
  handle_folder_select(path, value, elm, scope) {
    throw new Error("handle_folder_select not implemented");
  }
  handle_file_select(path, value, elm, scope) {
    throw new Error("handle_file_select not implemented");
  }
}

export class Setting {
  constructor(element) {
    this.element = element;
    this.container = this.createSettingItemContainer();
  }
  add_text(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.spellcheck = false;
    controlContainer.appendChild(textInput);
    configurator({
      inputEl: textInput,
      setPlaceholder: (placeholder) => textInput.placeholder = placeholder,
      setValue: (value) => textInput.value = value,
      onChange: (callback) => textInput.addEventListener('change', () => callback(textInput.value)),
      getValue: () => textInput.value
    });
    this.element.appendChild(this.container);
  }
  add_dropdown(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const select = document.createElement('select');
    controlContainer.appendChild(select);
    configurator({
      inputEl: select,
      addOption: (value, name, selected = false) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        select.appendChild(option);
        if (selected) {
          option.selected = true;
          option.classList.add("selected");
        }
        if (value === "") option.disabled = true;
        return option;
      },
      onChange: (callback) => select.addEventListener('change', () => callback(select.value)),
      setValue: (value) => select.value = value
    });
    this.element.appendChild(this.container);
  }
  add_button(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const button = document.createElement('button');
    controlContainer.appendChild(button);
    configurator({
      inputEl: button,
      setButtonText: (text) => button.textContent = text,
      onClick: (callback) => button.addEventListener('click', callback)
    });
    this.element.appendChild(this.container);
  }
  create_setting_item_container() {
    const container = document.createElement('div');
    container.classList.add('setting-item');
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('info');
    container.appendChild(infoContainer);
    // Placeholders for name and description
    const namePlaceholder = document.createElement('div');
    namePlaceholder.classList.add('name');
    infoContainer.appendChild(namePlaceholder);
    // const tagPlaceholder = document.createElement('div');
    // tagPlaceholder.classList.add('tag');
    // infoContainer.appendChild(tagPlaceholder);
    // const descPlaceholder = document.createElement('div');
    // descPlaceholder.classList.add('description');
    // infoContainer.appendChild(descPlaceholder);
    const controlContainer = document.createElement('div');
    controlContainer.classList.add('control');
    container.appendChild(controlContainer);
    return container;
  }
  add_toggle(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');
    controlContainer.appendChild(checkboxContainer);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.tabIndex = 0;
    checkboxContainer.appendChild(checkbox);
    configurator({
      setValue: (value) => {
        checkbox.checked = value;
        checkbox.value = value;
        checkboxContainer.classList.toggle('is-enabled', value);
      },
      onChange: (callback) => checkbox.addEventListener('change', () => {
        callback(checkbox.checked);
        checkboxContainer.classList.toggle('is-enabled', checkbox.checked);
      })
    });
    this.element.appendChild(this.container);
  }
  add_text_area(configurator) {
    const controlContainer = this.container.querySelector('.control');
    const textarea = document.createElement('textarea');
    textarea.spellcheck = false;
    controlContainer.appendChild(textarea);
    configurator({
      inputEl: textarea,
      setPlaceholder: (placeholder) => textarea.placeholder = placeholder,
      setValue: (value) => textarea.value = value,
      onChange: (callback) => textarea.addEventListener('change', () => callback(textarea.value))
    });
    this.element.appendChild(this.container);
  }
  add_folder_select(configurator) {
    const container = this.container.querySelector('.control');
    const folder_select = document.createElement('div');
    folder_select.classList.add('folder-select');
    container.appendChild(folder_select);
    const currentFolder = document.createElement('span');
    // currentFolder.type = 'text';
    currentFolder.classList.add('current');
    container.appendChild(currentFolder);
    const browse_btn = document.createElement('button');
    browse_btn.textContent = 'Browse';
    browse_btn.classList.add('browse-button');
    container.appendChild(browse_btn);
    configurator({
      inputEl: currentFolder,
      setPlaceholder: (placeholder) => currentFolder.placeholder = placeholder,
      setValue: (value) => currentFolder.innerText = value,
    });
    this.element.appendChild(this.container);
  }
  add_file_select(configurator) {
    const container = this.container.querySelector('.control');
    const file_select = document.createElement('div');
    file_select.classList.add('file-select');
    container.appendChild(file_select);
    const current_file = document.createElement('span');
    // current_file.type = 'text';
    current_file.classList.add('current');
    container.appendChild(current_file);
    const browse_btn = document.createElement('button');
    browse_btn.textContent = 'Browse';
    browse_btn.classList.add('browse-button');
    container.appendChild(browse_btn);
    configurator({
      inputEl: current_file,
      setPlaceholder: (placeholder) => current_file.placeholder = placeholder,
      setValue: (value) => current_file.innerText = value,
    });
    this.element.appendChild(this.container);
  }
  set_name(name) {
    const nameElement = this.container.querySelector('.name');
    if (nameElement) {
      nameElement.innerHTML = name;
    } else {
      // Create the element if it doesn't exist
      const newNameElement = document.createElement('div');
      newNameElement.classList.add('name');
      newNameElement.innerHTML = name;
      // this.element.appendChild(newNameElement);
      const info_container = this.container.querySelector('.info');
      info_container.prepend(newNameElement);
    }
  }
  set_desc(description) {
    let desc_element = this.container.querySelector('.description');
    if (!desc_element) {
      // Create the element if it doesn't exist
      desc_element = document.createElement('div');
      desc_element.classList.add('description');
      const info_container = this.container.querySelector('.info');
      info_container.appendChild(desc_element);
    }
    
    // Clear existing content
    desc_element.innerHTML = '';
    
    if (description instanceof DocumentFragment) {
      desc_element.appendChild(description);
    } else {
      desc_element.innerHTML = description;
    }
  }
  set_tooltip(tooltip) {
    const elm = this.container;
    const control_element = elm.querySelector('.control');
    control_element.setAttribute('title', tooltip);
    elm.setAttribute('title', tooltip);
    const tooltip_container = document.createElement('div');
    tooltip_container.classList.add('tooltip');
    tooltip_container.innerHTML = tooltip;
    elm.insertAdjacentElement('afterend', tooltip_container);
  }
  // aliases
  addText(configurator) { return this.add_text(configurator); }
  addDropdown(configurator) { return this.add_dropdown(configurator); }
  addButton(configurator) { return this.add_button(configurator); }
  createSettingItemContainer() { return this.create_setting_item_container(); }
  addToggle(configurator) { return this.add_toggle(configurator); }
  addTextArea(configurator) { return this.add_text_area(configurator); }
  addFolderSelect(configurator) { return this.add_folder_select(configurator); }
  addFileSelect(configurator) { return this.add_file_select(configurator); }
  setName(name) { return this.set_name(name); }
  setDesc(description) { return this.set_desc(description); }
  setTooltip(tooltip) { return this.set_tooltip(tooltip); }
}
