export class SourceAdapter {
  constructor(smart_source) {
    this.smart_source = smart_source;
  }

  async append(content) {
    throw new Error("append method not implemented");
  }

  async update(full_content, opts = {}) {
    throw new Error("update method not implemented");
  }

  async read(opts = {}) {
    throw new Error("read method not implemented");
  }

  async remove() {
    throw new Error("remove method not implemented");
  }

  async move_to(entity_ref) {
    throw new Error("move_to method not implemented");
  }

  async merge(content, opts = {}) {
    throw new Error("merge method not implemented");
  }

  async search(search_filter = {}) {
    throw new Error("search method not implemented");
  }

  // Helper methods that might be useful for derived classes
  async _update(content) {
    throw new Error("_update method not implemented");
  }

  async _read() {
    throw new Error("_read method not implemented");
  }
}