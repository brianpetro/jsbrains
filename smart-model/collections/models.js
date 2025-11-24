import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { SmartChatModel } from 'smart-chat-model';
import { SmartEmbedModel } from 'smart-embed-model';
import { Model } from '../items/model.js';

/**
 * Models collection for persisted model configurations.
 *
 * Responsibilities
 * - Persist Model items using the `model_configs` collection key and AJSON storage.
 * - Provide per-type defaults for SmartModel subclasses via `model_classes` and `model_opts`.
 * - Resolve scoped settings for chat/embed (or custom) model types through `get_model_settings`.
 * - Supply the default collection spec consumed by smart-collections loaders.
 *
 * @typedef {import('../items/model.js').ModelData} ModelData
 * @typedef {Object<string, Function>} ModelClasses map of model_type → SmartModel subclass constructors.
 * @typedef {Object<string, Object>} ModelOpts map of model_type → SmartModel constructor defaults.
 */
export class Models extends Collection {
  static collection_key = 'model_configs';
  collection_key = 'model_configs';
  data_dir = 'model_configs';

  constructor(env, opts = {}) {
    super(env, { ...opts, collection_key: 'model_configs', item_type: opts.item_type || Model });
    this.opts.model_classes = opts.model_classes || this.opts.model_classes;
    this.opts.model_opts = opts.model_opts || this.opts.model_opts || {};
  }

  static get default_model_classes() {
    return {
      chat: SmartChatModel,
      embed: SmartEmbedModel,
    };
  }

  get model_classes() {
    return this.opts.model_classes || this.constructor.default_model_classes;
  }

  get model_opts() {
    return this.opts.model_opts || {};
  }

  get default_settings() {
    return {
      ...super.default_settings,
      chat_model: {},
      embed_model: {},
    };
  }

  /**
   * Resolve settings for a model type by honoring overrides then collection settings.
   *
   * @param {string} model_type model type such as `chat` or `embed`.
   * @param {Object|undefined} override_settings optional override passed to `init_model`.
   * @returns {Object|undefined} resolved settings object or undefined to fall back to defaults.
   */
  get_model_settings(model_type, override_settings) {
    if (override_settings !== undefined) return override_settings;
    const scoped_settings = this.settings?.[`${model_type}_model`];
    if (scoped_settings && Object.keys(scoped_settings).length > 0) return scoped_settings;
    return undefined;
  }
}

export const models_collection = {
  class: Models,
  collection_key: 'model_configs',
  data_dir: 'model_configs',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Model,
};

export { Model };

export default models_collection;
