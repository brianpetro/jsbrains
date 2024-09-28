// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
export class SmartSettings {
  constructor(main, opts={}) {
    this.main = main;
    this.opts = {
      ...(this.main.smart_env_config || this.main.opts || {}),
      ...opts,
    };
    this._container = null;
    this.debouncer = {}; // debounce changes
  }
  get rel_instance() { return this.opts.rel_instance ?? this; }
  get setting_class() { return this.opts.smart_setting_class; }
  get settings() { return this.main.settings; }
  set settings(settings) { this.main.settings = settings; }
  async render_components(container) {
    const components = container.querySelectorAll(".setting-component");
    await Promise.all(Array.from(components).map(async (elm) => {
      await this.render_component(new this.setting_class(elm), elm);
    }));
  }
  get_callback_fx(callback_str) {
    return this.rel_instance[callback_str];
  }
  async render_component(setting_elm, elm) {
    if (elm.dataset.name) setting_elm.setName(elm.dataset.name);
    if (elm.dataset.description) setting_elm.setDesc(elm.dataset.description);
    const setting = elm.dataset.setting;
    if (elm.dataset.type === "text" || elm.dataset.type === "string") {
      setting_elm.addText(text => {
        text.setPlaceholder(elm.dataset.placeholder || "");
        const setting_value = elm.dataset.value || this.get_setting(setting) || "";
        if(setting_value) text.setValue(setting_value);
        if (!elm.dataset.btn) {
          text.onChange(async (value) => {
            if (elm.dataset.format === "array") value = value.split(",");
            else value = value.trim();
            this.handle_on_change(setting, value, elm);
          });
        }
      });
    } else if (elm.dataset.type === "password") {
      setting_elm.addText(text => {
        text.inputEl.type = "password";
        text.setPlaceholder(elm.dataset.placeholder || "");
        const setting_value = this.get_setting(setting);
        if(setting_value) text.setValue(setting_value);
        text.onChange(async (value) => this.handle_on_change(setting, value, elm));
      });
    } else if (elm.dataset.type === "number") {
      setting_elm.addText(number => {
        number.inputEl.type = "number";
        number.setPlaceholder(elm.dataset.placeholder || "");
        const setting_value = this.get_setting(setting);
        if(typeof setting_value !== 'undefined') number.inputEl.value = parseInt(this.get_setting(setting));
        number.inputEl.min = elm.dataset.min || 0;
        if (elm.dataset.max) number.inputEl.max = elm.dataset.max;
        number.onChange(async (value) => this.handle_on_change(setting, parseInt(value), elm));
      });
    } else if (elm.dataset.type === "dropdown") {
      const setting_value = this.get_setting(setting);
      const options = elm.dataset.optionsCallback
        ? await this.get_callback_fx(elm.dataset.optionsCallback)()
        : Object.entries(elm.dataset).reduce((acc, [k, v]) => {
          if (!k.startsWith('option')) return acc;
          const [value, name] = v.split("|");
          acc.push({ value, name: name || value });
          return acc;
        }, [])
      ;
      setting_elm.addDropdown(dropdown => {
        if(elm.dataset.required) dropdown.inputEl.setAttribute("required", true);
        options.forEach(option => dropdown.addOption(option.value, option.name ?? option.value, option.value === setting_value));
        dropdown.onChange(async (value) => this.handle_on_change(setting, value, elm));
        dropdown.setValue(setting_value);
      });
    } else if (elm.dataset.type === "button") {
      setting_elm.addButton(button => {
        button.setButtonText(elm.dataset.btnText || elm.dataset.name);
        button.onClick(async () => {
          if (elm.dataset.confirm) {
            const confirmation_message = elm.dataset.confirm;
            if (!confirm(confirmation_message)) return;
          }
          if (elm.dataset.href) this.open_url(elm.dataset.href);
          if (elm.dataset.callback) this.get_callback_fx(elm.dataset.callback)(setting, null, setting_elm);
        });
      });
    } else if (elm.dataset.type === "toggle") {
      setting_elm.addToggle(toggle => {
        let checkbox_val = elm.dataset.value ?? this.get_setting(setting) ?? true;
        if (typeof checkbox_val === 'string') {
          checkbox_val = checkbox_val.toLowerCase() === 'true';
        }
        toggle.setValue(checkbox_val);
        toggle.onChange(async (value) => this.handle_on_change(setting, value, elm));
      });
    } else if (elm.dataset.type === "textarea") {
      setting_elm.addTextArea(textarea => {
        textarea.setPlaceholder(elm.dataset.placeholder || "");
        const current_setting_value = this.get_setting(setting);
        textarea.setValue(elm.dataset.value || current_setting_value || "");
        textarea.onChange(async (value) => {
          console.log("textarea value changed");
          // if(elm.dataset.format === "array") value = value.split("\n");
          value = value.split("\n").map(v => v.trim()).filter(v => v).join("\n");
          this.handle_on_change(setting, value, elm);
        });
      });
    } else if (elm.dataset.type === "folder") {
      setting_elm.addFolderSelect(folder_select => {
        folder_select.setPlaceholder(elm.dataset.placeholder || "");
        const value = this.get_setting(setting);
        if(typeof value !== 'undefined') folder_select.setValue(value);
        folder_select.inputEl.closest('div').addEventListener("click", () => {
          this.handle_folder_select(setting, value, elm);
        });
      });
    } else if (elm.dataset.type === "text-file") {
      setting_elm.addFileSelect(file_select => {
        file_select.setPlaceholder(elm.dataset.placeholder || "");
        const value = this.get_setting(setting);
        if(typeof value !== 'undefined') file_select.setValue(value);
        file_select.inputEl.closest('div').addEventListener("click", () => {
          this.handle_file_select(setting, value, elm);
        });
      });
    }
    if(elm.dataset.tooltip) setting_elm.set_tooltip(elm.dataset.tooltip);
    // add button to any setting
    if (elm.dataset.btn) {
      setting_elm.addButton(button => {
        button.setButtonText(elm.dataset.btn);
        button.inputEl.addEventListener("click", (e) => {
          if (elm.dataset.btnCallback && typeof this[elm.dataset.btnCallback] === "function") this[elm.dataset.btnCallback](setting, null, setting_elm);
          else if (elm.dataset.btnHref) this.open_url(elm.dataset.btnHref);
          else if (elm.dataset.callback && typeof this.get_callback_fx(elm.dataset.callback) === "function") this.get_callback_fx(elm.dataset.callback)(setting, null, setting_elm);
          else if (elm.dataset.href) this.open_url(elm.dataset.href);
          else console.error("No callback or href found for button.");
        });
        if (elm.dataset.btnDisabled || (elm.dataset.disabled && elm.dataset.btnDisabled !== "false")) button.inputEl.disabled = true;
      });
    }
    if (elm.dataset.disabled && elm.dataset.disabled !== "false") {
      elm.classList.add("disabled");
      elm.querySelector("input, select, textarea, button").disabled = true;
    }
    if (elm.dataset.hidden && elm.dataset.hidden !== "false") elm.style.display = "none";
  }
  open_url(url) { window.open(url); }
  handle_on_change(setting, value, elm=null) {
    // debounce
    if(this.debouncer[setting]) clearTimeout(this.debouncer[setting]);
    this.debouncer[setting] = setTimeout(async () => {
      const changed = await this.update(setting, value, elm); // save setting
      console.log("setting changed: " + changed);
      if(changed && elm?.dataset.callback){ // call callback if setting changed
        if(!this.get_callback_fx(elm.dataset.callback)) return console.error(`Callback ${elm.dataset.callback} not found.`);
        this.get_callback_fx(elm.dataset.callback)(setting, value, elm);
      }
      if(elm?.dataset.isScope) this.re_render();
      this.debouncer[setting] = null;
    }, 300);
  }
  re_render() { this.opts['re_render']?.(); }
  get_setting(setting_path) {
    // should handle progress_labels.success.msg_vars.1
    const setting_keys = setting_path.split(".");
    let value = this.settings;
    for (const key of setting_keys) {
      if (typeof value[key] === 'undefined'){
        console.log(`missing key: ${key} in`, setting_path, this.settings);
        return null; // Handle missing nested properties
      }
      value = value[key];
    }
    if(Array.isArray(value)) return value.join("\n");
    return value;
  }
  async update(setting_path, value, elm) {
    const setting_keys = setting_path.split("."); // should handle progress_labels.success.msg_vars.1
    let setting_obj = this.settings;
    let og;
    setting_keys.forEach((key, i) => {
      if(i === setting_keys.length - 1) {
        og = setting_obj[key];
        setting_obj[key] = value;
      }
      if(setting_obj[key] === undefined) setting_obj[key] = {}; // create missing nested properties
      setting_obj = setting_obj[key];
    });
    console.log("saving setting: " + setting_path);
    this.save_settings();
    console.log("saved settings");
    const changed = og !== value;
    this.after_update(setting_path, value, elm, changed);
    return changed; // return true if value changed
  }
  after_update(setting, value, elm, changed) { } // override in subclass
  add_listeners() { } // override in subclass
  save_settings() { } // override in subclass
  settings_filter(setting_name) { return true; } // override in subclass (return false to hide setting)
  // onchange callbacks created in subclass
  handle_folder_select(setting, value, elm) { } // override in subclass
  handle_file_select(setting, value, elm) { } // override in subclass
}

