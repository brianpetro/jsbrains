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
}
