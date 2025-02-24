import { SourceContentAdapter } from './_adapter.js';

export class DataContentAdapter extends SourceContentAdapter {
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