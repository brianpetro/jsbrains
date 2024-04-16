const models = require('./models');

/**
 * An universal interface for embedding models.
 */
class SmartEmbed {
  /**
   * Create a SmartEmbed instance.
   * @param {string|object} model - The model configuration key or the model configuration object.
   */
  constructor(model) {
    if (typeof model === 'object') {
      this.config = { ...model };
    } else {
      this.model_config_key = model;
      this.config = models[this.model_config_key];
    }
    // Initialize statistics
    this.embed_ct = 0; // Count of embeddings processed
    this.timestamp = null; // Last operation timestamp
    this.tokens = 0; // Count of tokens processed
  }

  /**
   * Factory method to create a new SmartEmbed instance and initialize it.
   * @param {string} model_config_key - The key to retrieve model configuration from models.
   * @param {...any} args - Additional arguments to pass to the constructor.
   * @returns {Promise<SmartEmbed>} A promise that resolves with an initialized SmartEmbed instance.
   */
  static async create(model_config_key, ...args) {
    const adapter = new this(model_config_key, ...args);
    await adapter.init();
    return adapter;
  }

  /**
   * Initialize the SmartEmbed instance. Placeholder for actual initialization logic.
   */
  async init() { }

  /**
   * Count the number of tokens in the input string.
   * @param {string} input - The input string to process.
   * @returns {Promise<number>} A promise that resolves with the number of tokens.
   */
  async count_tokens(input) { }

  /**
   * Embed the input string into a numerical array.
   * @param {string} input - The input string to embed.
   * @returns {Promise<number[]>} A promise that resolves with the embedding array.
   */
  async embed(input) { }

  /**
   * Embed a batch of input strings into arrays of numerical arrays.
   * @param {string[]} input - The array of strings to embed.
   * @returns {Promise<number[][]>} A promise that resolves with the array of embedding arrays.
   */
  async embed_batch(input) { }

  /**
   * Get the configured batch size for embedding.
   * @returns {number} The batch size.
   */
  get batch_size() { return this.config.batch_size; }

  /**
   * Get the dimensions of the embedding.
   * @returns {number} The dimensions of the embedding.
   */
  get dims() { return this.config.dims; }

  /**
   * Get the maximum number of tokens that can be processed.
   * @returns {number} The maximum number of tokens.
   */
  get max_tokens() { return this.config.max_tokens; }

  /**
   * Get the name of the model used for embedding.
   * @returns {string} The model name.
   */
  get model_name() { return this.config.model_name; }
}

exports.SmartEmbed = SmartEmbed;