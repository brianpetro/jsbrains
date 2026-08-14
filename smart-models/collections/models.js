import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Model } from '../items/model.js';

export class Models extends Collection {
  model_type = 'Model type'; // replace in subclass
  new_model(data = {}) {
    if(!data.provider_key) throw new Error('provider_key is required to create a new model');
    const model_data = { ...data };
    const provider_config = this.env_config.providers?.[model_data.provider_key] || {};
    const uses_api_key = Boolean(provider_config.settings_config?.api_key);
    const uses_credential_id = Boolean(
      this.env_config.api_key_is_credential_id && uses_api_key
    );
    const existing_from_provider = this.filter((model) => {
      if (model.provider_key !== model_data.provider_key) return false;
      if (!uses_credential_id) return true;
      return model.data.api_key_is_credential_id && model.data.api_key;
    }).sort((a, b) => b.data.created_at - a.data.created_at)[0];
    let legacy_api_key = '';

    if (uses_credential_id) {
      model_data.api_key_is_credential_id = true;
      model_data.api_key = model_data.api_key
        || existing_from_provider?.data.api_key
        || ''
      ;
    } else if (uses_api_key) {
      // LEGACY: non-credential model platforms still store raw API keys in
      // model data. Remove after every supported platform uses credential IDs.
      legacy_api_key = model_data.api_key || existing_from_provider?.api_key || '';
      delete model_data.api_key;
    } else {
      delete model_data.api_key;
      delete model_data.api_key_is_credential_id;
      delete model_data.secret_source_key;
    }

    const item = new this.item_type(this.env, model_data);
    this.set(item);
    if (legacy_api_key) item.api_key = legacy_api_key;
    this.emit_event('model:changed');
    item.queue_save();
    return item;
  }
  /**
   * Retrieve the provider key used when creating a default model.
   * @abstract
   * @returns {string} provider key for the default model.
   */
  get default_provider_key() {
    throw new Error('default_provider_key not implemented');
  }

  get default_model_key() {
    const should_update_default = !this.settings.default_model_key
      || !this.get(this.settings.default_model_key)
      || this.get(this.settings.default_model_key).deleted
    ;
    if(should_update_default) {
      const existing = this.filter(m => !m.deleted)
        .sort((a, b) => b.data.created_at - a.data.created_at)[0] // sort by most recently created
      ;
      if(existing) {
        this.settings.default_model_key = existing.key;
      } else {
        const new_default = this.new_model({ provider_key: this.default_provider_key }); // default provider
        new_default.queue_save();
        this.process_save_queue();
        this.settings.default_model_key = new_default.key;
      }
    }
    return this.settings.default_model_key;
  }

  get default() {
    return this.get(this.default_model_key)
  }
  get env_config() {
    return this.env.config.collections[this.collection_key];
  }

  get_model_key_options() {
    return this.filter(i => !i.deleted && i.ProviderAdapterClass).map(model => ({
      label: model.data.meta?.name || `${model.provider_key} - ${model.data.model_key}`,
      value: model.key,
    }));
  }

}
/**
 * @returns {import('smart-types').SettingsConfig} Settings configuration for Models collection.
 */
export function settings_config(scope) {
  return {
    default_model_key: {
      type: 'dropdown',
      name: `Default ${scope.model_type.toLowerCase()} model`,
      description: `Used as the default ${scope.model_type.toLowerCase()} model when no other is specified.`,
      options_callback: () => {
        return scope.get_model_key_options();
      },
      callback: async (value, setting) => {
        scope.emit_event('model:changed');
      },
    },
  };
}

export const models_collection = {
  class: Models,
  data_dir: 'models',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Model,
  providers: {},
  settings_config
};

export default models_collection;

