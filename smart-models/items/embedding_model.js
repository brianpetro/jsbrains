import {Model} from './model.js';

export class EmbeddingModel extends Model {

  async embed(input) {
    if (typeof input === 'string') {
      input = [{embed_input: input}];
    }
    return this.embed_batch(input);
  }

  async embed_batch(inputs) {
    return this.instance.embed_batch(inputs);
  }

}

