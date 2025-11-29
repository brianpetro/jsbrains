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
  get model_platform() {
    return this.model?.model_platform;
  }

  get adapter_key() {
    const adapter_key = this.model.model_platform.adapter_key;
    return adapter_key;
  }

}

export default ModelTypeAdapter;
