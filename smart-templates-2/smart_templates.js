import { SmartSources } from "smart-sources";

/**
 * @class SmartTemplates
 * @extends SmartSources
 * @description Collection class for managing smart templates and their outputs
 */
export class SmartTemplates extends SmartSources {
  /**
   * @returns {SmartTemplateOutputs} The collection of template outputs
   * @description Gets the template outputs collection from the environment
   */
  get outputs() {
    return this.env.smart_template_outputs;
  }
}