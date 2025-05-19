/**
 * @file smart_contexts.js
 *
 * Manages a collection of SmartContext items. Also provides a compile_adapters map
 * so each SmartContext can choose which adapter to use when building a final output.
 */

import { Collection } from 'smart-collections';

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
   * Default settings for all SmartContext items in this collection.
   * @readonly
   */
  get default_settings() {
    return {
      link_depth: 0,
      inlinks: false,
      follow_links_in_excluded: true, // NEW: toggle whether to follow outlinks from excluded headings
      excluded_headings: [],
      max_len: 0, // 0 => no enforced limit
      templates: {
        '-1': {
          before: '{{FILE_TREE}}'
        },
        '0': {
          before: '{{ITEM_PATH}}\n```{{ITEM_EXT}}',
          after: '```'
        },
        '1': {
          before: 'LINK: {{ITEM_NAME}}\n```{{ITEM_EXT}}',
          after: '```'
        },
        '1': {
          before: 'REF: {{ITEM_NAME}}\n```{{ITEM_EXT}}',
          after: '```'
        },
      },
    };
  }

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
      inlinks: {
        name: 'In-links',
        description: 'Include inbound links from other items?',
        type: 'toggle'
      },
      excluded_headings: {
        name: 'Excluded headings',
        description: 'Headings/patterns to exclude; use newline to separate multiple patterns. Case-sensitive',
        type: 'textarea_array'
      },
      follow_links_in_excluded: {
        name: 'Follow links in excluded headings?',
        description: 'If off, any links found inside excluded heading sections are ignored (not followed).',
        type: 'toggle'
      },
      context_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Context templates</h5>
            <span>Included once in the final output at the beginning (before_context) and end (after_context).</span>
            <br>
            <br>
            <span>Available variables:</span>
            <ul>
              <li><code>{{FILE_TREE}}</code> - Shows hierarchical view of all files</li>
            </ul>
          </div>
        `
      },
      before_context: {
        setting: 'templates.-1.before',
        name: 'Before context',
        description: 'Text inserted at the top of the final output.',
        type: 'textarea'
      },
      after_context: {
        setting: 'templates.-1.after',
        name: 'After context',
        description: 'Text inserted at the bottom of the final output.',
        type: 'textarea'
      },
      item_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Item templates</h5>
            <span>Included once for each item (before_item and after_item).</span>
            <br>
            <br>
            <span>Available variables:</span>
            <ul>
              <li><code>{{ITEM_PATH}}</code> - Full path of the item</li>
              <li><code>{{ITEM_NAME}}</code> - Filename of the item</li>
              <li><code>{{ITEM_EXT}}</code> - File extension</li>
              <li><code>{{ITEM_DEPTH}}</code> - Depth level of the item</li>
              <li><code>{{ITEM_TIME_AGO}}</code> - Time since the item was last modified</li>
            </ul>
          </div>
        `
      },
      before_item: {
        setting: 'templates.0.before',
        name: 'Before each primary item',
        description: 'Text inserted before each depth=0 item.',
        type: 'textarea'
      },
      after_item: {
        setting: 'templates.0.after',
        name: 'After each primary item',
        description: 'Text inserted after each depth=0 item.',
        type: 'textarea'
      },
      link_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Link templates</h5>
            <span>Inserted before/after each link-based item (depth=1,2,...). 
                  Typically used to separate these items from the primary content.
                  <i>Note: links are treated similar to items but are aggregated after all items.</i>
            </span>
            <br>
            <br>
            <span>Available variables:</span>
            <ul>
              <li><code>{{ITEM_PATH}}</code> - Full path of the linked file</li>
              <li><code>{{ITEM_NAME}}</code> - Filename of the linked file</li>
              <li><code>{{ITEM_EXT}}</code> - File extension</li>
              <li><code>{{ITEM_DEPTH}}</code> - Depth level of the link</li>
              <li><code>{{ITEM_TIME_AGO}}</code> - Time since the linked file was last modified</li>
            </ul>
          </div>
        `
      },
      before_link: {
        setting: 'templates.1.before',
        name: 'Before link item',
        description: 'Text inserted before each depth=1 link item.',
        type: 'textarea'
      },
      after_link: {
        setting: 'templates.1.after',
        name: 'After link item',
        description: 'Text inserted after each depth=1 link item.',
        type: 'textarea'
      }
    };
  }
  get_ref(key) {
    const collection = key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
    return collection.get(key);
  }
}

export default { SmartContexts };