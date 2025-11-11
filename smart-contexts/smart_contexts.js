/**
 * @file smart_contexts.js
 *
 * Manages a collection of SmartContext items. Also provides a compile_adapters map
 * so each SmartContext can choose which adapter to use when building a final output.
 */

import { Collection } from 'smart-collections';
import { AjsonSingleFileCollectionDataAdapter } from "smart-collections/adapters/ajson_single_file.js";
import { SmartContext } from './smart_context.js';

/**
 * @class SmartContexts
 * @extends Collection
 * @classdesc
 * Manages a collection of SmartContext items, each representing a set of references
 * or data relevant to a specific use case (e.g., building a textual context for AI).
 */
export class SmartContexts extends Collection {
  static version = 0.1;

  /**
   * new_context
   * @param {object} data
   * @param {object} opts
   * @param {string[]} opts.add_items
   * @returns {SmartContext}
   */
  new_context(data = {}, opts = {}) {
    const item = new this.item_type(this.env, data);
    if(Array.isArray(opts.add_items)) item.add_items(opts.add_items);
    this.set(item);
    item.queue_save();
    this.emit_event('context:created');
    return item;
  }
  /**
   * Default settings for all SmartContext items in this collection.
   * @readonly
   */
  get default_settings() {
    return {
      template_before: '<context>\n<file_tree>\n{{FILE_TREE}}\n</file_tree>',
      template_after: '</context>',
      // DEPRECATED
      // link_depth: 0,
      // inlinks: false,
      // follow_links_in_excluded: true, // NEW: toggle whether to follow outlinks from excluded headings
      // excluded_headings: [],
      // max_len: 0, // 0 => no enforced limit
      // DEPRECATED TEMPLATES
      // templates: {
      //   '-1': {
      //     before: `<context>\n<file_tree>\n{{FILE_TREE}}\n</file_tree>`,
      //     after: `</context>`
      //   },
      //   '0': {
      //     before: `<context_primary path="{{ITEM_PATH}}" mtime="{{ITEM_TIME_AGO}}">`,
      //     after: `</context_primary>`
      //   },
      //   '1': {
      //     before: `<context_linked path="{{ITEM_PATH}}" mtime="{{ITEM_TIME_AGO}}">`,
      //     after: `</context_linked>`
      //   },
      // },
    };
  }

  /**
   * @deprecated in favor of get_text and get_media
   */
  get compile_adapters() {
    if (!this._compile_adapters) {
      this._compile_adapters = {};
      Object.values(this.opts.compile_adapters || {}).forEach((cls) => {
        this._compile_adapters[cls.adapter_key] = cls;
      });
    }
    return this._compile_adapters;
  }

  get settings_config() {
    return {
      template_before: {
        type: 'textarea',
        name: 'Template Before',
        description: 'Template to wrap before the context.',
      },
      template_after: {
        type: 'textarea',
        name: 'Template After',
        description: 'Template to wrap after the context.',
      },
      // DEPRECATED TEMPLATES
      // context_explanation: {
      //   type: 'html',
      //   value: `
      //     <div class="setting-explanation">
      //       <h5>Context templates</h5>
      //       <span>Included once in the final output at the beginning (before_context) and end (after_context).</span>
      //       <br>
      //       <br>
      //       <span>Available variables:</span>
      //       <ul>
      //         <li><code>{{FILE_TREE}}</code> - Shows hierarchical view of all files</li>
      //       </ul>
      //     </div>
      //   `
      // },
      // before_context: {
      //   setting: 'templates.-1.before',
      //   name: 'Before context',
      //   description: 'Text inserted at the top of the final output.',
      //   type: 'textarea'
      // },
      // after_context: {
      //   setting: 'templates.-1.after',
      //   name: 'After context',
      //   description: 'Text inserted at the bottom of the final output.',
      //   type: 'textarea'
      // },
      // item_explanation: {
      //   type: 'html',
      //   value: `
      //     <div class="setting-explanation">
      //       <h5>Item templates</h5>
      //       <span>Included once for each item (before_item and after_item).</span>
      //       <br>
      //       <br>
      //       <span>Available variables:</span>
      //       <ul>
      //         <li><code>{{ITEM_PATH}}</code> - Full path of the item</li>
      //         <li><code>{{ITEM_NAME}}</code> - Filename of the item</li>
      //         <li><code>{{ITEM_EXT}}</code> - File extension</li>
      //         <li><code>{{ITEM_DEPTH}}</code> - Depth level of the item</li>
      //         <li><code>{{ITEM_TIME_AGO}}</code> - Time since the item was last modified</li>
      //       </ul>
      //     </div>
      //   `
      // },
      // before_item: {
      //   setting: 'templates.0.before',
      //   name: 'Before each primary item',
      //   description: 'Text inserted before each depth=0 item.',
      //   type: 'textarea'
      // },
      // after_item: {
      //   setting: 'templates.0.after',
      //   name: 'After each primary item',
      //   description: 'Text inserted after each depth=0 item.',
      //   type: 'textarea'
      // },
      // link_explanation: {
      //   type: 'html',
      //   value: `
      //     <div class="setting-explanation">
      //       <h5>Link templates</h5>
      //       <span>Inserted before/after each link-based item (depth=1,2,...). 
      //             Typically used to separate these items from the primary content.
      //             <i>Note: links are treated similar to items but are aggregated after all items.</i>
      //       </span>
      //       <br>
      //       <br>
      //       <span>Available variables:</span>
      //       <ul>
      //         <li><code>{{ITEM_PATH}}</code> - Full path of the linked file</li>
      //         <li><code>{{ITEM_NAME}}</code> - Filename of the linked file</li>
      //         <li><code>{{ITEM_EXT}}</code> - File extension</li>
      //         <li><code>{{ITEM_DEPTH}}</code> - Depth level of the link</li>
      //         <li><code>{{ITEM_TIME_AGO}}</code> - Time since the linked file was last modified</li>
      //       </ul>
      //     </div>
      //   `
      // },
      // before_link: {
      //   setting: 'templates.1.before',
      //   name: 'Before link item',
      //   description: 'Text inserted before each depth=1 link item.',
      //   type: 'textarea'
      // },
      // after_link: {
      //   setting: 'templates.1.after',
      //   name: 'After link item',
      //   description: 'Text inserted after each depth=1 link item.',
      //   type: 'textarea'
      // }
    };
  }
  get_ref(key) {
    const collection = key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
    return collection.get(key);
  }
}

/* default export consumed by SmartEnv */
export default {
  class          : SmartContexts,
  collection_key : "smart_contexts",
  data_adapter   : AjsonSingleFileCollectionDataAdapter,
  item_type      : SmartContext,
  version: 2,
};
