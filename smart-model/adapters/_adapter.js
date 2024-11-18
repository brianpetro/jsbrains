/**
 * @class SmartModelAdapter
 * @abstract
 */
export class SmartModelAdapter {
  constructor(model) {
    this.model = model;
    this.state = 'unloaded';
  }
  async load() {
    // Implement in subclasses if needed
    this.set_state('loaded');
  }
  unload() {
    // Implement in subclasses if needed
    this.set_state('unloaded');
  }
  get model_key() { return this.model.model_key; }
  get model_config() { return this.model.model_config; }
  get settings() { return this.model.settings; }
  get model_settings() { return this.settings?.[this.model_key] || {}; }
  /**
   * Set the state of the SmartModel.
   * @param {string} new_state - The new state to set.
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