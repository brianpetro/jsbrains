import { Collection } from "smart-collections";

/**
 * @class SmartCompletions
 * @extends Collection
 */
export class SmartCompletions extends Collection {
  static version = 0.1;

  /**
   * Lazily instantiates and returns a chat_model. Similar to how
   * @returns {Object|null} The chat model instance or null if not configured
   */
  get chat_model() {
    if (!this._chat_model) {
      if(this.env.chat_completion_models?.default?.instance){
        return this.env.chat_completion_models.default.instance;
      }
    }
    return this._chat_model;
  }

  /**
   * Force unload & reload of chat model if user changes adapter or settings.
   */
  reload_chat_model() {
    if (this._chat_model?.unload) {
      this._chat_model.unload();
    }
    this._chat_model = null;
  }

  get settings_config() {
    return {}
  }

  get completion_adapters() {
    if(!this._completion_adapters) {
      this._completion_adapters = Object.values(this.opts.completion_adapters || {})
        .sort((a, b) => (a.order || 0) - (b.order || 0)) // sort by order property ascending
      ;
    }
    return this._completion_adapters;
  }

}