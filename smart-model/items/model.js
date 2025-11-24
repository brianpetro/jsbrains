import { CollectionItem } from 'smart-collections/item.js';

/**
 * Model item for the `model_configs` collection.
 *
 * Responsibilities
 * - Persist a single model configuration with type, adapter choice, and adapter-specific settings.
 * - Provide convenience accessors for `name`, `model_type`, and `model_config` with sensible defaults.
 * - Act as a factory that builds and initializes the correct SmartModel subclass via `init_model`.
 *
 * @typedef {Object} ModelData
 * @property {string} key Unique identifier for the config item. Recommended: `${model_type}#${created_at_ms}`.
 * @property {string} [name] Display label; falls back to `key` when omitted.
 * @property {'chat'|'embed'|string} model_type SmartModel family to instantiate.
 * @property {string} [platform_key] Optional provider/platform namespace for grouping.
 * @property {Object} model_config Adapter-level configuration object merged with defaults.
 * @property {string} model_config.adapter Adapter key inside the SmartModel `adapters` map.
 * @property {string} [model_config.id] Provider model identifier, slug, or deployment name.
 * @property {number} [model_config.dims] Embedding dimension override for embed models.
 * @property {string} [model_config.model_key] Optional override for SmartModel `model_key` selection.
 *
 * @typedef {Object} ModelInitOverrides
 * @property {string} [model_type] Force a specific model type instead of using `item.model_type`.
 * @property {Object} [model_classes] Optional override map `{ [model_type]: SmartModelSubclass }`.
 * @property {Object} [model_config] Per-call overrides merged over stored and default configs.
 * @property {Object} [adapters] Optional override for SmartModel adapters map.
 * @property {Object} [settings] Override for resolved model settings.
 * @property {Object} [opts] Additional top-level options merged into SmartModel constructor options.
 * @property {string} [model_key] Explicit override for SmartModel `model_key`.
 */
export class Model extends CollectionItem {
  static collection_key = 'model_configs';
  collection_key = 'model_configs';

  static get defaults() {
    return {
      ...super.defaults,
      data: {
        ...super.defaults.data,
        class_name: 'Model',
        model_type: 'chat',
        model_config: {},
      },
    };
  }

  get name() {
    return this.data.name || this.data.key || this.key;
  }

  set name(val) {
    this.data.name = val;
  }

  get model_type() {
    return this.data.model_type || 'chat';
  }

  set model_type(val) {
    this.data.model_type = val || 'chat';
  }

  get model_config() {
    if (!this.data.model_config) this.data.model_config = {};
    return this.data.model_config;
  }

  set model_config(val) {
    this.data.model_config = val || {};
  }

  /**
   * Initialize a SmartModel subclass based on the stored model data and overrides.
   *
   * Flow
   * 1. Determine the effective model type.
   * 2. Resolve the ModelClass from collection or overrides.
   * 3. Merge collection defaults, stored config, and overrides into constructor options.
   * 4. Instantiate the SmartModel subclass and await `initialize` when present.
   *
   * @param {ModelInitOverrides} overrides optional overrides for initialization.
   * @returns {Promise<any>} Ready-to-use SmartModel instance.
   */
  async init_model(overrides = {}) {
    const effective_type = overrides.model_type || this.model_type || 'chat';
    const collection = this.collection;
    if (!collection) throw new Error('Model must belong to a Models collection.');

    const model_classes = overrides.model_classes || collection.model_classes;
    const ModelClass = model_classes?.[effective_type];

    if (!ModelClass) {
      throw new Error(`Model class not found for type '${effective_type}'`);
    }

    const base_opts = collection.model_opts[effective_type] || {};
    const settings = collection.get_model_settings(effective_type, overrides.settings);
    const merged_model_config = {
      ...(base_opts.model_config || {}),
      ...this.model_config,
      ...(overrides.model_config || {}),
    };
    const ctor_opts = {
      ...base_opts,
      ...(overrides.opts || {}),
      adapters: overrides.adapters || base_opts.adapters,
      settings: settings ?? base_opts.settings ?? {},
      model_config: merged_model_config,
      model_key: overrides.model_key || merged_model_config.model_key,
      model_type: effective_type,
    };

    const model = new ModelClass(ctor_opts);
    if (typeof model.initialize === 'function') {
      await model.initialize();
    }
    return model;
  }
}

export default Model;
