import { FileSourceContentAdapter } from "./_file.js";

export class TextSourceContentAdapter extends FileSourceContentAdapter {
  static embed_input_action_key = 'source_get_embed_input_text';

  get embed_input_action_key() {
    return this.constructor.embed_input_action_key;
  }
}

export default {
  collection: null, // No collection adapter needed for text sources
  item: TextSourceContentAdapter
};