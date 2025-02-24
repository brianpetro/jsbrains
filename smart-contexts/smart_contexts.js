/**
 * @file smart_contexts.js
 *
 * @description
 * Provides the SmartContexts collection class. Extends `Collection` from smart-collections,
 * manages multiple SmartContext items, merges default settings, and includes logic
 * for backward compatibility with older settings fields (e.g., before_context -> templates[-1].before).
 */

import { Collection } from 'smart-collections';
import { SmartContext } from './smart_context.js';

/**
 * @class SmartContexts
 * @extends Collection
 * @classdesc
 * Manages a collection of SmartContext items, each representing a set of references
 * or data relevant to a specific use case (e.g., building a textual context for AI).
 */
export class SmartContexts extends Collection {
  /**
   * Default settings for all SmartContext items in this collection.
   * @readonly
   */
  get default_settings() {
    return {
      link_depth: 0,
      inlinks: false,
      excluded_headings: [],
      max_len: 0, // 0 means no enforced limit
      templates: {
        '-1': { before: '', after: '' },
        '0': { before: '', after: '' },
        '1': { before: '', after: '' },
        '2': { before: '', after: '' }
      }
    };
  }

  /**
   * Runs after the collection is constructed or loaded. Ensures backwards
   * compatibility with older fields like `before_context`, `after_context`, etc.
   */
  async init() {
    // TEMP: for backwards compatibility 2025-02-18
    // copy old settings to new format
    if (!this.settings.templates) this.settings.templates = {};
    if (!this.settings.templates['-1']) this.settings.templates['-1'] = {};
    if (!this.settings.templates['0']) this.settings.templates['0'] = {};
    if (!this.settings.templates['1']) this.settings.templates['1'] = {};
    Object.entries(this.settings).forEach(([key, value]) => {
      if (key === 'before_context' && value) {
        this.settings.templates['-1'].before = value;
        delete this.settings.before_context;
      } else if (key === 'after_context' && value) {
        this.settings.templates['-1'].after = value;
        delete this.settings.after_context;
      } else if (key === 'before_item' && value) {
        this.settings.templates['0'].before = value;
        delete this.settings.before_item;
      } else if (key === 'after_item' && value) {
        this.settings.templates['0'].after = value;
        delete this.settings.after_item;
      } else if (key === 'before_link' && value) {
        this.settings.templates['1'].before = value;
        delete this.settings.before_link;
      } else if (key === 'after_link' && value) {
        this.settings.templates['1'].after = value;
        delete this.settings.after_link;
      }
    });
  }

  /**
   * The item type used by this collection (SmartContext).
   * @readonly
   */
  get item_type() {
    return SmartContext;
  }

  /**
   * Renders a settings configuration for this collection.
   * Extend or override to provide dynamic settings or additional fields.
   */
  get settings_config() {
    return {
      inlinks: {
        name: 'In-links',
        description: 'Include inbound links from other items?',
        type: 'toggle'
      },
      excluded_headings: {
        name: 'Excluded headings',
        description: 'Headings/patterns to exclude; use newline to separate multiple patterns.',
        type: 'textarea_array'
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
}

export default { SmartContexts };
