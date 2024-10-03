import { SourceAdapter } from "./_adapter.js";

export class SourceTestAdapter extends SourceAdapter {
  constructor(smart_source) {
    super(smart_source);
    this.content = this.smart_source.collection.adapter.test_data[this.smart_source.constructor.name+":"+this.smart_source.data.path].content;
  }

  async append(content) {
    this.content += "\n" + content;
  }

  async update(full_content, opts = {}) {
    this.content = full_content;
  }
  async _update(content) {
    this.content = content;
  }

  async read(opts = {}) {
    return this.content;
  }
  async _read() {
    return this.content;
  }

  async remove() {
    this.content = "";
    this.smart_source.delete();
  }

  async move_to(entity_ref) {
    // For testing purposes, we'll just update the path
    const new_path = typeof entity_ref === "string" ? entity_ref : entity_ref.key;
    if (!new_path) {
      throw new Error("Invalid entity reference for move_to operation");
    }
    this.smart_source.data.path = new_path;
  }

  async merge(content, opts = {}) {
    const { mode = 'append_blocks' } = opts;
    if (mode === 'replace_all') {
      this.content = content;
    } else {
      this.content += "\n" + content;
    }
    await this.smart_source.parse_content();
  }

}