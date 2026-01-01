import { build_action_descriptor } from '../utils/build_action_descriptor.js';
import { convert_openapi_to_tools } from '../utils/openapi_to_tools.js';

export class SmartActionAdapter {
  constructor(item) {
    this.item = item;
    this.module = null;
  }
  async load() {
    // added manually using imported module
  }
  /**
   * Run the loaded module’s default (or named) function with given params.
   * @param {Object} params
   * @returns {Promise<any>}
   */
  async run(params) {
    if (!this.module) {
      await this.load();
    }
    const fn = this.module.default || this.module[this.item.key];
    if (typeof fn !== 'function') {
      throw new Error(`${this.constructor.name}: No callable export found for action ${this.item.key}`);
    }
    return await fn.call(this.item, params);
  }

  /**
   * Generate an OpenAI-style tool definition for this action.
   * By default it checks `module.tool` or converts `module.openapi`.
   * @returns {object|null}
   */
  get as_tool() {
    if (!this.module) return null;
    const descriptor = this.descriptor;
    return descriptor?.tool || null;
  }

  /**
   * Build the Smart Action descriptor, including schema and tool definition.
   * @returns {object|null}
   */
  get descriptor() {
    if (!this.module) return null;
    return build_action_descriptor({ module: this.module, action_key: this.item.key });
  }
}
export { convert_openapi_to_tools };
