import {Model} from './model.js';

export class ChatCompletionModel extends Model {

  async complete(req) {
    return this.instance.complete(req);
  }

  async stream(req, handlers = {}) {
    return this.instance.stream(req, handlers);
  }

  async test_model() {
    try{
      const resp = await this.complete({
        messages: [
          {role: 'user', content: '2+2='},
        ]
      });
      const success = !resp.error;
      this.data.test_passed = success;
      this.debounce_save();
      return {success, response: resp};
    } catch (e) {
      this.data.test_passed = false;
      return {error: e.message || String(e)};
    }
  }
}