import { SmartBlocks } from 'smart-sources';
import { SmartTemplateOutput } from './template_output.js';

/**
 * @class SmartTemplateOutputs
 * @extends SmartBlocks
 * @classdesc Manages a collection of SmartTemplateOutput items. 
 * Each output is associated with a SmartTemplate and stores AI-generated responses.
 */
export class SmartTemplateOutputs extends SmartBlocks {
  /**
   * Overriding item type
   */
  get item_type() {
    return SmartTemplateOutput;
  }

  /**
   * Possibly override init or process_save_queue if needed
   */
  async init() {
    await super.init();
  }
}
