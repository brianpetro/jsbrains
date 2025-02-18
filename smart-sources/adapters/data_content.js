import { SourceContentAdapter } from './_adapter.js';

export class DataContentAdapter extends SourceContentAdapter {
  async read() {
    return this.item.data.content;
  }
}

export default {
  item: DataContentAdapter
};