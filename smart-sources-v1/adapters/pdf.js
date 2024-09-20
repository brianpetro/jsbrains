import { SourceAdapter } from "./_adapter.js";

export class SmartSourcesPdfAdapter extends SourceAdapter {
  async _read() {
    return await this.smart_source.fs.read(this.smart_source.data.path, 'base64');
  }
  async read() {
    if(!this.data.content) {
      const base64 = await this._read();
      // PROBLEM: CANNOT USE PDF IN VISION API (2024-09-20)  
    }
    // Return content from data.content
    return this.data.content;

  }

  update() {
    throw new Error('not available for file type');
  }

  create() {
    throw new Error('not available for file type');
  }
}