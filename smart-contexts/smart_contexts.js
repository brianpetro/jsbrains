/**
 * smart_contexts.js
 * 
 * @fileoverview
 * Provides the SmartContexts collection class and its updated implementation 
 * based on the latest specs, including the new 'respect_exclusions' logic.
 */

import { Collection } from 'smart-collections';
import { SmartContext } from './smart_context.js';

/**
 * @class SmartContexts
 * @extends Collection
 * @classdesc Manages a collection of SmartContext items, each representing a set of 
 * references or data relevant to a specific use-case. Handles link_depth, 
 * inlinks, excluded_headings, and context-building logic.
 */
export class SmartContexts extends Collection {
  /**
   * Default settings for SmartContexts. Matches updated specs fields.
   * @readonly
   */
  get default_settings() {
    return {
      link_depth: 0,
      inlinks: false,
      excluded_headings: [],
      before_context: '',
      after_context: '',
      before_item: '',
      after_item: '',
      before_link: '',
      after_link: '',
    };
  }

  /**
   * The item type used by this collection (SmartContext).
   * @readonly
   */
  get item_type() {
    return SmartContext;
  }


  get settings_config() {
    return {
      // link_depth: {
      //   name: 'Link depth',
      //   description: 'Number of links to follow from the start item.',
      //   type: 'number',
      // },
      inlinks: {
        name: 'In-links',
        description: 'Whether to include in-links when including links (includes out-links by default).',
        type: 'toggle',
      },
      excluded_headings: {
        name: 'Excluded headings',
        description: 'Glob patterns or headings to exclude from the final output. Separate each pattern with a newline.',
        type: 'textarea_array',
      },
      context_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Context Templates</h5>
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
        name: 'Before context',
        description: 'Text inserted at the top of the final compiled text.',
        type: 'textarea',
      },
      after_context: {
        name: 'After context',
        description: 'Text inserted at the bottom of the final compiled text.',
        type: 'textarea',
      },
      item_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Item Templates</h5>
            <span>Included once for each item (before_item and after_item).</span>
            <br>
            <br>
            <span>Available variables:</span>
            <ul>
              <li><code>{{ITEM_PATH}}</code> - Full path of the item</li>
              <li><code>{{ITEM_NAME}}</code> - Filename of the item</li>
              <li><code>{{ITEM_EXT}}</code> - File extension</li>
            </ul>
          </div>
        `
      },
      before_item: {
        name: 'Before each item',
        description: 'Text inserted before each item.',
        type: 'textarea',
      },
      after_item: {
        name: 'After each item',
        description: 'Text inserted after each item.',
        type: 'textarea',
      },
      link_explanation: {
        type: 'html',
        value: `
          <div class="setting-explanation">
            <h5>Link Templates</h5>
            <span>Included once for each link (before_link and after_link). <i>Note: links are treated similar to items but are aggregated after all items.</i></span>
            <br>
            <br>
            <span>Available variables:</span>
            <ul>
              <li><code>{{LINK_PATH}}</code> - Full path of the linked file</li>
              <li><code>{{LINK_NAME}}</code> - Filename of the linked file</li>
              <li><code>{{LINK_TYPE}}</code> - Type of link (IN-LINK/OUT-LINK)</li>
              <li><code>{{LINK_DEPTH}}</code> - Depth level of the link</li>
              <li><code>{{LINK_EXT}}</code> - File extension</li>
            </ul>
          </div>
        `
      },
      before_link: {
        name: 'Before each link',
        description: 'Text inserted before each link item.',
        type: 'textarea',
      },
      after_link: {
        name: 'After each link',
        description: 'Text inserted after each link item.',
        type: 'textarea',
      },
    };
  }
}

export default { SmartContexts };
