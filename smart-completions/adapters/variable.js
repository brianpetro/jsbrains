import { SmartCompletionAdapter } from './_adapter.js';

export class SmartCompletionVariableAdapter extends SmartCompletionAdapter {
  static order = 100; // Default order, can be overridden by specific adapters
  static registry = [];

  static register(matcher_fx, replacement_fx, var_example) {
    this.registry.push({ matcher_fx, replacement_fx, var_example });
  }

  static get available_vars() {
    return this.registry.map(({ var_example }) => var_example);
  }

  static async replace_vars(env, text) {
    for (const { matcher_fx, replacement_fx } of this.registry) {
      if (await matcher_fx.call(env, text)) {
        text = await replacement_fx.call(env, text);
      }
    }
    return text;
  }

  async to_request() {
    const messages = this.request.messages || [];
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        msg.content = await this.constructor.replace_vars(this.env, msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part && typeof part.text === 'string') {
            part.text = await this.constructor.replace_vars(this.env, part.text);
          }
        }
      }
    }
  }

  async from_response() {}
}
