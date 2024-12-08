import { SmartSources } from "smart-sources";

export class SmartTemplates extends SmartSources {
  get outputs() {
    return this.env.smart_template_outputs;
  }
}