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
   * Get all settings.
   * @returns {Object} All settings
   */
  get settings() { return this.model.settings; }

  /**
   * Get model-specific settings.
   * @returns {Object} Settings for current model
   */
  get model_settings() { return this.settings?.[this.model_key] || {}; }

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