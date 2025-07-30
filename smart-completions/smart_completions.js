/**
 * @file smart_completions.js
 * @description
 * A specialized collection for managing completion items, each representing a single
 * request/response cycle with the chat model. It supports 'new_completion(data)' to bootstrap
 * minimal input, integrates the environment's chat_model, and can run request adapters if
 * defined in `this.completion_adapters`.
 *
 * Also merges the chat_model's settings_config if present, so that UI can handle them together.
 */

import { Collection } from "smart-collections";

/**
 * @class SmartCompletions
 * @extends Collection
 */
export class SmartCompletions extends Collection {

  /**
   * Lazily instantiates and returns a chat_model. Similar to how
   * SmartEntities implements embed_model. You can adapt this
   * depending on how your environment is structured.
   *
   * @returns {Object|null} The chat model instance or null if not configured
   */
  get chat_model() {
    if (!this._chat_model) {
      this._chat_model = this.env.init_module('smart_chat_model', {
        model_config: {},
        settings: this.settings.chat_model
          ?? this.env.smart_chat_threads?.settings?.chat_model // temporary fallback until completions default settings are implemented in Smart Env settings
          ?? {},
        reload_model: this.reload_chat_model.bind(this),
        re_render_settings: this.re_render_settings?.bind(this) ?? (() => { console.log('no re_render_settings') }),
      });
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

  /**
   * In addition to base collection settings, merges `chat_model.settings_config`.
   * Allows the SmartCompletions UI to show chat-model relevant settings.
   * @returns {Object} Merged settings config
   */
  get settings_config() {
    return {}
  }

  /**
   * (Optional) An array of request adapter classes. SmartCompletion items will invoke these
   * in `run_completion_adapters()`. For example, we can list the context adapter or other custom ones.
   */
  get completion_adapters() {
    if(!this._completion_adapters) {
      this._completion_adapters = {};
      Object.entries(this.opts.completion_adapters).forEach(([key, adapter]) => {
        this._completion_adapters[adapter.property_name || key] = adapter;
      });
    }
    return this._completion_adapters;
  }

}