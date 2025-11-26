export class ModelTypeAdapter {
  constructor(model_item) {
    this.model = model_item;
    this.platform = model_item.platform;
  }

  get adapter_key() {
    const adapter_key = this.platform?.adapter_key;
    if (!adapter_key) {
      throw new Error('Platform adapter_key is required to build a model instance.');
    }
    return adapter_key;
  }

  get platform_adapter_settings() {
    return this.platform?.adapter_settings || {};
  }

  get model_settings() {
    return this.model?.data?.model?.settings || {};
  }

  merge_settings(adapter_key) {
    const base_settings = { ...(this.model_settings || {}) };
    const adapter_settings = { ...(base_settings[adapter_key] || {}) };
    base_settings[adapter_key] = { ...adapter_settings, ...this.platform_adapter_settings };
    if (!base_settings.adapter) base_settings.adapter = adapter_key;
    return base_settings;
  }

  merge_opts(base_opts, extra_opts = {}) {
    const merged_model_config = {
      ...base_opts.model_config,
      ...(extra_opts.model_config || {}),
    };

    const merged_settings = {
      ...base_opts.settings,
      ...(extra_opts.settings || {}),
    };

    return {
      ...base_opts,
      ...extra_opts,
      model_config: merged_model_config,
      settings: merged_settings,
    };
  }

  has_extra_opts(extra_opts = {}) {
    return Object.keys(extra_opts || {}).length > 0;
  }
}

export default ModelTypeAdapter;
