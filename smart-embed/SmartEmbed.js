const models = require('./models');
class SmartEmbed {
  constructor(model) {
    if(typeof model === 'object') {
      this.config = {...model};
    }else{
      this.model_config_key = model;
      this.config = models[this.model_config_key];
    }
    // stats
    this.embed_ct = 0;
    this.timestamp = null;
    this.tokens = 0;
  }
  static async create(model_config_key, ...args) {
    const adapter = new this(model_config_key, ...args);
    await adapter.init();
    return adapter;
  }
  async init() { }
  /**
   * @param {string} input
   * @returns {Promise<number>}
   */
  async count_tokens(input) { }
  /**
   * @param {string} input
   * @returns {Promise<number[]>}
   */
  async embed(input) { }
  /**
   * @param {string[]} input
   * @returns {Promise<number[][]>}
   */
  async embed_batch(input) { }
  get batch_size() { return this.config.batch_size; }
  get dims() { return this.config.dims; }
  get max_tokens() { return this.config.max_tokens; }
  get model_name() { return this.config.model_name; }
}

exports.SmartEmbed = SmartEmbed;