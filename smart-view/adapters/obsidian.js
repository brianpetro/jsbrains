import { SmartViewAdapter } from "./_adapter.js";
import {
  Setting,
  MarkdownRenderer,
  Component,
  getIcon,
  Keymap
} from "obsidian";

export class SmartViewObsidianAdapter extends SmartViewAdapter {
  get setting_class() { return Setting; }
  
  open_url(url) { window.open(url); }
  
  async render_file_select_component(elm, path, value) {
    return super.render_text_component(elm, path, value);
  }
  
  async render_markdown(markdown, scope) {
    const component = scope.env.smart_connections_plugin?.connections_view || new Component();
    if(!scope) return console.warn("Scope required for rendering markdown in Obsidian adapter");
    // MarkdownRenderer attempts to get container parent and throws error if not present
    // So wrap in extra div to act as parent and render into inner div
    const frag = this.main.create_doc_fragment("<div><div class='inner'></div></div>");
    const container = frag.querySelector(".inner");
    try{
      await MarkdownRenderer.render(
        scope.env.plugin.app,
        markdown,
        container,
        scope?.file_path || "",
        component
      );
    }catch(e){
      console.warn("Error rendering markdown in Obsidian adapter", e);
    }
    return frag;
  }
  get_icon_html(name) { return getIcon(name).outerHTML; }
  // Obsidian Specific
  is_mod_event(event) { return Keymap.isModEvent(event); }

  render_folder_select_component(elm, path, value, scope, settings_scope) {
    const smart_setting = new this.setting_class(elm);
    const folders = scope.env.plugin.app.vault.getAllFolders().sort((a, b) => a.path.localeCompare(b.path));
        
    smart_setting.addDropdown(dropdown => {
      if (elm.dataset.required) dropdown.inputEl.setAttribute("required", true);
      dropdown.addOption("", "No folder selected");
      folders.forEach(folder => {
        dropdown.addOption(folder.path, folder.path);
      });
      dropdown.onChange((value) => {
        this.handle_on_change(path, value, elm, scope, settings_scope);
      });
      dropdown.setValue(value);
    });
    return smart_setting;
  }

}

// export class SmartViewObsidianAdapter extends SmartViewNodeAdapter {
//   constructor(main) {
//     super(main);
//     this._cached_proxy = null; // To store the cached proxy
//   }

//   get setting_class() {
//     // If the proxy has been cached, return it
//     if (this._cached_proxy) {
//       return this._cached_proxy;
//     }

//     const original_class = this.main.env.plugin.obsidian.Setting;

//     // Capture `this` context for using inside the proxy
//     const adapter = this;

//     // Create and cache the proxy for the class
//     this._cached_proxy = new Proxy(original_class, {
//       construct(target, args) {
//         // Create a new instance of the class
//         const instance = new target(...args);

//         // Use the `create_snake_case_wrapper` method from `adapter`
//         return adapter.create_snake_case_wrapper(instance);
//       },

//       // Delegate any other static properties or methods on the class
//       get(target, prop, receiver) {
//         return Reflect.get(target, prop, receiver);
//       }
//     });

//     return this._cached_proxy;
//   }

//   // Create a proxy wrapper to handle both camelCase and snake_case methods on instances
//   create_snake_case_wrapper(instance) {
//     return new Proxy(instance, {
//       get(target, prop) {
//         // Avoid recursion by checking if the property exists before further processing
//         if (prop in target) {
//           return target[prop];
//         }

//         // Convert snake_case to camelCase (if prop doesn't already exist)
//         const camel_case_prop = prop.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

//         // Return the camelCase method if it exists
//         if (camel_case_prop in target && typeof target[camel_case_prop] === 'function') {
//           return target[camel_case_prop].bind(target);
//         }

//         // Fallback to undefined or return undefined explicitly if method not found
//         return undefined;
//       }
//     });
//   }
// }
