import {Model} from './model.js';

export class ChatCompletionModel extends Model {

  async complete(req) {
    return this.instance.complete(req);
  }

  async stream(req, handlers = {}) {
    return this.instance.stream(req, handlers);
  }


}


