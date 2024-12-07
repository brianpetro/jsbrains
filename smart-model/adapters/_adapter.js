/**
 * Base adapter class for SmartModel implementations.
 * Provides core functionality for state management and settings access.
 * 
 * @abstract
 * @class SmartModelAdapter
 */
export class SmartModelAdapter {
  /**
   * Create a SmartModelAdapter instance.
   * @param {SmartModel} model - The parent SmartModel instance
   */
  constructor(model) {
    this.model = model;
    this.state = 'unloaded';
  }

  /**
   * Load the adapter.
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    this.set_state('loaded');
  }

  /**
   * Unload the adapter.
   * @returns {void}
   */
  unload() {
    this.set_state('unloaded');
  }

  /**
   * Get all settings.
   * @returns {Object} All settings
   */
  get settings() { return this.model.settings; }

  /**
   * Get the current model key.
   * @returns {string} Current model identifier
   */
  get model_key() { return this.model.model_key; }

  /**
   * Get the current model configuration.
   * @returns {Object} Model configuration
   */
  get model_config() { return this.model.model_config; }

  /**
   * Get model-specific settings.
   * @returns {Object} Settings for current model
   */
  get model_settings() { return this.model.model_settings; }

  /**
   * Get adapter-specific configuration.
   * @returns {Object} Adapter configuration
   */
  get adapter_config() { return this.model.adapter_config; }

  /**
   * Get adapter-specific settings.
   * @returns {Object} Adapter settings
   */
  get adapter_settings() { return this.model.adapter_settings; }


  /**
   * Get the models.
   * @returns {Object} Map of model objects
   */
  get models() {
    if(
      typeof this.adapter_config.models === 'object'
      && Object.keys(this.adapter_config.models || {}).length > 0
    ) return this.adapter_config.models;
    else {
      return {};
    }
  }

  /**
   * Get available models from the API.
   * @abstract
   * @param {boolean} [refresh=false] - Whether to refresh cached models
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models(refresh = false) {
    throw new Error("get_models not implemented");
  }
  /**
   * Validate the parameters for get_models.
   * @returns {boolean|Array<Object>} True if parameters are valid, otherwise an array of error objects
   */
  validate_get_models_params(){
    return true;
  }
  /**
   * Get available models as dropdown options synchronously.
   * @returns {Array<Object>} Array of model options.
   */
  get_models_as_options() {
    const models = this.models;
    const params_valid = this.validate_get_models_params();
    if(params_valid !== true) return params_valid;
    if(!Object.keys(models || {}).length){
      this.get_models(true); // refresh models
      return [{value: '', name: 'No models currently available'}];
    }
    return Object.values(models).map(model => ({ value: model.id, name: model.name || model.id })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Set the adapter's state.
   * @param {('unloaded'|'loading'|'loaded'|'unloading')} new_state - The new state
   * @throws {Error} If the state is invalid
   */
  set_state(new_state) {
    const valid_states = ['unloaded', 'loading', 'loaded', 'unloading'];
    if (!valid_states.includes(new_state)) {
      throw new Error(`Invalid state: ${new_state}`);
    }
    this.state = new_state;
  }
  // Replace individual state getters/setters with a unified state management
  get is_loading() { return this.state === 'loading'; }
  get is_loaded() { return this.state === 'loaded'; }
  get is_unloading() { return this.state === 'unloading'; }
  get is_unloaded() { return this.state === 'unloaded'; }
}