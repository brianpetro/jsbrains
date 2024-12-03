import { SourceAdapter } from "./_adapter.js";
export class FileSourceAdapter extends SourceAdapter {
  async update(content) {
    await this.fs.write(this.file_path, content);
  }
  async read() {
    return await this.fs.read(this.file_path);
  }
  get file_path() { return this.item.file_path; }
}