import { SmartSources } from 'smart-sources';
import { SmartTemplate } from './smart_template.js';
import { SmartTemplateOutputs } from './template_outputs.js';

/**
 * @class SmartTemplates
 * @extends SmartSources
 * @classdesc Manages a collection of SmartTemplate items. Integrates with `SmartTemplateOutputs` for handling
 * generated outputs. Follows the same architecture pattern as SmartSources, but specialized for templating.
 */
export class SmartTemplates extends SmartSources {
  /**
   * Overriding to specify item type and local usage
   * @returns {Function} The constructor for SmartTemplate items
   */
  get item_type() {
    return SmartTemplate;
  }

  /**
   * Reference to the associated outputs collection, similar to how smart_blocks references exist in smart_sources
   * @type {SmartTemplateOutputs}
   */
  get outputs() {
    return this.env.smart_template_outputs;
  }

  /**
   * Initialization routine. We'll keep it minimal if there's no special logic yet.
   */
  async init() {
    await super.init();  // re-use SmartSources logic if it scans the FS
    // Additional logic for templates can go here
  }

  /**
   * Example method: load queue
   * In many Smart* classes, we process a queue of items that were flagged for load
   */
  async process_load_queue() {
    // Possibly do specialized load logic, or just reuse the base class’s approach
    await super.process_load_queue();
  }
}
