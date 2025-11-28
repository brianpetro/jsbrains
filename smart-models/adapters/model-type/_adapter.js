/**
 * Base adapter for model types (chat_completion, embedding).
 *
 * Responsible for:
 * - exposing model / platform / env
 * - resolving adapter_key
 * - merging platform + model settings into SmartModel.settings
 * - merging base_opts + extra_opts for SmartModel constructors
 */
export class ModelTypeAdapter {
  static init(models_collection) {
    // no-op base init
    // subclasses can override to add default model items, etc
  }
  /**
   * @param {import('../../items/model.js').Model} model
   */
  constructor(model) {
    this.model = model;
    this._model_instance = null;
  }

  /**
   * @returns {any} shared env from the model
   */
  get env() {
    return this.model?.env;
  }

  /**
   * @returns {import('../../items/platform.js').Platform | undefined}
   */
  get platform() {
    return this.model?.platform;
  }

  /**
   * Resolve the adapter key for this model:
   * - prefer model.data.adapter_key
   * - then model.data.model.adapter_key
   * - finally platform.adapter_key
   *
   * @returns {string}
   */
  get adapter_key() {
    const model_data = this.model_data;
    const adapter_key =
      this.model?.data?.adapter_key
      || model_data.adapter_key
      || this.platform?.adapter_key;

    if (!adapter_key) {
      const key = (this.model && this.model.get_key && this.model.get_key())
        || this.model?.id
        || 'unknown';
      throw new Error(
        `No adapter_key found for model '${key}'. ` +
        `Set model.data.adapter_key, model.data.model.adapter_key, or platform.adapter_key.`
      );
    }

    return adapter_key;
  }

  /**
   * Convenience accessor for platform-level adapter settings.
   * This is expected to be provider-scoped config for the
   * selected adapter (api_key, base_url, defaults, etc).
   *
   * @returns {object}
   */
  get platform_adapter_settings() {
    return this.platform?.adapter_settings || {};
  }

  /**
   * Convenience accessor for the model's stored config blob.
   *
   * @returns {object}
   */
  get model_data() {
    return this.model?.data?.model || {};
  }

  /**
   * Convenience accessor for the model's stored SmartModel.settings
   * snapshot (if any).
   *
   * @returns {object}
   */
  get model_settings() {
    return this.model_data?.settings || {};
  }

  /**
   * Merge platform.adapter_settings + model.data.model.settings
   * into a SmartModel.settings object.
   *
   * - Start with model-level settings (persisted per model).
   * - Ensure settings[adapter_key] exists and is:
   *     { ...platform.adapter_settings, ...model.settings[adapter_key] }
   *
   * This is what gets passed into SmartChatModel / SmartEmbedModel
   * as `opts.settings`.
   *
   * @param {string} adapter_key
   * @returns {object} SmartModel.settings
   */
  merge_settings(adapter_key) {
    const platform_settings = this.platform_adapter_settings || {};
    const model_settings = this.model_settings || {};

    const adapter_model_settings =
      (model_settings && model_settings[adapter_key]) || {};

    const merged_adapter_settings = {
      ...platform_settings,
      ...adapter_model_settings,
    };

    return {
      ...model_settings,
      [adapter_key]: merged_adapter_settings,
    };
  }

  /**
   * Merge base_opts (derived from model + platform) with extra_opts
   * for constructing SmartChatModel / SmartEmbedModel.
   *
   * Behavior:
   * - If extra_opts is empty → return base_opts as-is.
   * - Shallow merge top-level keys (extra_opts wins).
   * - Deep-merge the nested `settings` object so that:
   *     base_opts.settings[adapter_key].* are preserved unless
   *     explicitly overridden by extra_opts.settings[adapter_key].*
   *
   * @param {object} base_opts
   * @param {object} extra_opts
   * @returns {object}
   */
  merge_opts(base_opts = {}, extra_opts = {}) {
    if (!extra_opts || Object.keys(extra_opts).length === 0) {
      return base_opts;
    }

    const base_settings = base_opts.settings || {};
    const extra_settings = extra_opts.settings || {};

    // Shallow merge for top-level keys.
    const merged = {
      ...base_opts,
      ...extra_opts,
    };

    // Deep-ish merge for settings.
    if (base_opts.settings || extra_opts.settings) {
      merged.settings = this.merge_settings_object(base_settings, extra_settings);
    }

    return merged;
  }

  /**
   * Helper to merge two settings objects:
   * - shallow merge keys
   * - if both values are plain objects, shallow merge them too
   *
   * This keeps per-adapter settings objects (e.g. settings.openai)
   * intact while allowing selective overrides.
   *
   * @param {object} base_settings
   * @param {object} extra_settings
   * @returns {object}
   */
  merge_settings_object(base_settings = {}, extra_settings = {}) {
    const merged = { ...base_settings };

    Object.keys(extra_settings || {}).forEach((key) => {
      const base_val = base_settings[key];
      const extra_val = extra_settings[key];

      const base_is_object =
        base_val && typeof base_val === 'object' && !Array.isArray(base_val);
      const extra_is_object =
        extra_val && typeof extra_val === 'object' && !Array.isArray(extra_val);

      if (base_is_object && extra_is_object) {
        merged[key] = { ...base_val, ...extra_val };
      } else {
        merged[key] = extra_val;
      }
    });

    return merged;
  }

  /**
   * Determine if extra_opts contains any semantic overrides that
   * should trigger a one-off SmartModel instance instead of using
   * the cached one.
   *
   * Lifecycle callbacks like re_render_settings / reload_model
   * do NOT count as extra opts.
   *
   * @param {object} extra_opts
   * @returns {boolean}
   */
  has_extra_opts(extra_opts = {}) {
    if (!extra_opts) return false;

    const keys = Object.keys(extra_opts).filter((key) => (
      key !== 're_render_settings' && key !== 'reload_model'
    ));

    return keys.length > 0;
  }

  /**
   * Subclasses must implement:
   * - build_model_opts(extra_opts)
   * - get_model_instance(extra_opts)
   */
}

export default ModelTypeAdapter;
