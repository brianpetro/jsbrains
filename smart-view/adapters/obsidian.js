import { SmartViewNodeAdapter } from "./node.js";
import { Setting, MarkdownRenderer, Component } from "obsidian";

export class SmartViewObsidianAdapter extends SmartViewNodeAdapter {
  get setting_class() { return Setting; }
  
  open_url(url) { window.open(url); }
  
  render_file_select_component(elm, path, value) {
    return super.render_text_component(elm, path, value);
  }
  
  render_folder_select_component(elm, path, value) {
    return super.render_text_component(elm, path, value);
  }

  async render_markdown(markdown, scope=null) {
    const frag = this.main.create_doc_fragment("<div></div>");
    await MarkdownRenderer.render(
      this.main.env.plugin.app,
      markdown,
      frag, // container
      scope?.file_path || "",
      new Component()
    );
    return frag;
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
