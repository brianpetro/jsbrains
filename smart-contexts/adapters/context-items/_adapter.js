export class ContextItemAdapter {
  constructor(item) {
    this.item = item;
  }
  static detect(key, data={}) { return false; }
  get env() { return this.item.env; }
  get exists() { return true; }

  // v3 API
  /**
   * for calculating context size
   */
  get size () { return 0; }

  async get_text() {}

  async open () {}


  /**
   * @deprecated in favor of get_text and get_media
   */
  async add_to_snapshot(snapshot, opts = {}) {}
  /**
   * @deprecated probably unused since newer action getter implementation for context-suggest 
   */
  async find_connections(opts = {}) { return []; }
}
