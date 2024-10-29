import { MarkdownSourceAdapter } from "./markdown.js";

export class SourceTestAdapter extends MarkdownSourceAdapter {
  constructor(item) {
    super(item);
    this.content = this.item.collection.adapter.test_data[this.item.constructor.name+":"+this.item.data.path].content;
  }

  get fs() { return this.source_collection.fs; }
  get data() { return this.item.data; }
  get file_path() { return this.item.data.path; }
  get source() { return this.item.source ? this.item.source : this.item; }

  async _update(content) {
    this.content = content;
  }

  async _read() {
    return this.content;
  }

  async remove() {
    this.content = "";
    this.item.delete();
  }

}