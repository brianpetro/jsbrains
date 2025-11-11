import { ContextItemAdapter } from './_adapter.js';

export class PdfContextItemAdapter extends ContextItemAdapter {
  static detect(key) {
    if (key.endsWith('.pdf')) return 'pdf';
    return false;
  }
  async add_to_snapshot(snapshot) {
    if (!snapshot.pdfs) snapshot.pdfs = [];
    snapshot.pdfs.push(this.item.key);
  }

  get exists() {
    return this.item.env.smart_sources.fs.exists_sync(this.item.key);
  }
}
