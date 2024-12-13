import { SourceContentAdapter } from "./_adapter.js";
export class FileSourceContentAdapter extends SourceContentAdapter {
  get fs() { return this.item.collection.fs; }
  get file_path() { return this.item.file_path; }
  async create(content=null) {
    if(!content) content = this.item.data.content || "";
    await this.fs.write(this.file_path, content);
  }
  async update(content) {
    await this.fs.write(this.file_path, content);
  }
  async read() {
    const content = await this.fs.read(this.file_path);
    this.data.last_read = {
      hash: await this.create_hash(content),
      at: Date.now(),
    };
    return content;
  }
  async remove() {
    await this.fs.remove(this.file_path);
  }
}