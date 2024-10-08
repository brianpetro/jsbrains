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
import ejs from "./ejs.min.cjs";
class SmartSettings {
  constructor(env, container, opts = { template_name: "smart_settings" }) {
    this.env = env;
    this.main = opts.main || this.env.plugin; // DEPRECATED in favor of snake_case name of plugin class
    this.plugin = this.main; // DEPRECATED in favor of main
    this.container = container;
    if(typeof opts === 'string') opts = { template_name: opts }; // DEPRECATED handling
    this.template_name = opts.template_name;
    this.ejs = this.env.ejs || ejs;
    this.templates = this.env.opts.templates; // DEPRECATE in favor of views???
    this.views = this.templates;
  }
  // get settings() { return this.main.settings; }
  // set settings(settings) { this.main.settings = settings; }
  get settings() { return this.env.settings; }
  set settings(settings) { this.env.settings = settings; }
  async render() {
    const view_data = (typeof this.get_view_data === "function") ? await this.get_view_data() : this.view_data;
    this.render_template(view_data);
    await this.render_components();
  }
  render_template(view_data = null) {
    if (!this.template) throw new Error(`Settings template not found.`);
    this.container.empty();
    this.container.innerHTML = this.ejs.render(this.template, view_data || this.view_data, { context: this });
  }
  async update(setting, value) {
    let settings = {...this.settings};
    if (setting.includes(".")) {
      let parts = setting.split(".");
      let obj = settings;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = (typeof value === "string") ? value.trim() : value;
    } else {
      settings[setting] = (typeof value === "string") ? value.trim() : value;
    }
    await this.env.smart_settings.save(settings);
  }
  async render_components() {
    if(!this.main.obsidian.Setting) console.warn("missing Obsidian Setting component");
    this.container.querySelectorAll(".setting-component").forEach(async elm => {
      const setting_elm = new this.main.obsidian.Setting(elm);
      if (elm.dataset.name) setting_elm.setName(elm.dataset.name);
      if (elm.dataset.description) setting_elm.descEl.innerHTML = elm.dataset.description;
      const setting = elm.dataset.setting;
      if (elm.dataset.type === "text") {
        setting_elm.addText(text => {
          text.setPlaceholder(elm.dataset.placeholder || "");
          text.setValue(this.get_setting(setting));
          let debounceTimer;
          if (elm.dataset.button) {
            setting_elm.addButton(button => {
              button.setButtonText(elm.dataset.button);
              button.onClick(async () => this.handle_on_change(setting, text.getValue(), elm));
            });
          } else {
            text.onChange(async (value) => {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => this.handle_on_change(setting, value, elm), 2000);
            });
          }
        });
      } else if (elm.dataset.type === "password") {
        setting_elm.addText(text => {
          text.inputEl.type = "password";
          text.setPlaceholder(elm.dataset.placeholder || "");
          const setting_value = this.get_setting(setting);
          if (setting_value) text.setValue(setting_value);
          text.onChange(async (value) => this.handle_on_change(setting, value, elm));
        });
      } else if (elm.dataset.type === "number") {
        setting_elm.addText(number => {
          number.inputEl.type = "number";
          number.setPlaceholder(elm.dataset.placeholder || "");
          number.inputEl.value = parseInt(this.get_setting(setting));
          number.inputEl.min = elm.dataset.min || 0;
          if (elm.dataset.max) number.inputEl.max = elm.dataset.max;
          let debounceTimer;
          number.onChange(async (value) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.handle_on_change(setting, parseInt(value), elm), 2000);
          });
        });
      } else if (elm.dataset.type === "dropdown") {
        const setting_value = this.get_setting(setting) || elm.dataset.value;
        let options;
        if (elm.dataset.optionsCallback) {
          if (typeof this[elm.dataset.optionsCallback] !== 'function') {
            console.error(`Options callback ${elm.dataset.optionsCallback} is not a function.`);
            options = [];
          } else {
            options = await this[elm.dataset.optionsCallback]();
          }
        } else {
          options = Object.entries(elm.dataset)
            .filter(([k, v]) => k.startsWith("option"))
            .map(([k, v]) => {
              const [value, name] = v.split("|");
              return { value, name: name || value };
            });
        }
        setting_elm.addDropdown(dropdown => {
          options.forEach(option => dropdown.addOption(option.value, option.name));
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
            if (elm.dataset.href) window.open(elm.dataset.href);
            if (elm.dataset.callback) this[elm.dataset.callback](setting, null, elm);
          });
        });
      } else if (elm.dataset.type === "toggle") {
        setting_elm.addToggle(toggle => {
          toggle.setValue(this.get_setting(setting));
          toggle.onChange(async (value) => this.handle_on_change(setting, value, elm));
        });
      } else if (elm.dataset.type === "textarea") {
        setting_elm.addTextArea(textarea => {
          textarea.setValue(this.get_setting(setting));
          textarea.onChange(async (value) => this.handle_on_change(setting, value, elm));
          if (elm.dataset.maxLength) textarea.inputEl.maxLength = elm.dataset.maxLength;
        });
      }
      if (elm.dataset.disabled) setting_elm.setDisabled(true);
    });
  }
  async handle_on_change(setting, value, elm) {
    await this.update(setting, value);
    if (elm.dataset.callback) this[elm.dataset.callback](setting, value, elm);
  }
  get_setting(setting) {
    if (setting.includes(".")) {
      let parts = setting.split(".");
      // let obj = this.plugin.settings;
      let obj = this.settings;
      for (let part of parts.slice(0, -1)) {
        if (obj[part] === undefined) return this.plugin.constructor.defaults[setting]; // Fallback to default if path is broken
        obj = obj[part];
      }
      return obj[parts[parts.length - 1]] ?? this.plugin.constructor.defaults[setting];
    } else {
      // return this.plugin.settings[setting] ?? this.plugin.constructor.defaults[setting];
      return this.settings[setting] ?? this.plugin.constructor.defaults[setting];
    }
  }
  // override in subclass (required)
  get template() { return ""; } // ejs template string
  get view_data() { return {}; } // object properties available in template
}
export { SmartSettings };