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
  get is_media() {
    return true;
  }
  async get_base64() {
    try {
      const base64_data = await this.item.env.fs.read(this.item.key, 'base64');
      const base64_url = `data:application/pdf;base64,${base64_data}`;
      return {
        type: 'pdf_url',
        key: this.item.key,
        name: this.item.key.split(/[\\/]/).pop(),
        url: base64_url
      };
    } catch (err) {
      console.warn(`Failed to convert PDF ${this.item.key} to base64`, err);
      return {error: `Failed to convert PDF to base64: ${err.message}`};
    }
  }
  get exists() {
    return this.item.env.smart_sources.fs.exists_sync(this.item.key);
  }
}
