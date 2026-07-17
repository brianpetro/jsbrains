import { SourceContentAdapter } from './_adapter.js';

export class DataContentAdapter extends SourceContentAdapter {
  static embed_input_action_key = 'source_get_embed_input_data';

  get embed_input_action_key() {
    return this.constructor.embed_input_action_key;
  }

  static get extensions() {
    return ['data'];
  }
  async read() {
    return this.item.data.content;
  }
  async import() {
    // mute
  }
}

export default {
  item: DataContentAdapter
};