/**
 * @class SmartChatDataAdapter
 * @description Base adapter class for chat data format conversions.
 * Provides interface for converting between internal format and various chat formats.
 */
export class SmartThreadDataAdapter {
  /**
   * @constructor
   * @param {SmartThread} item - The SmartThread instance this adapter is attached to
   */
  constructor(item) {
    this.item = item;
  }

  /**
   * @property {Object} data - The underlying data of the SmartThread
   * @readonly
   */
  get data() { return this.item.data; }
  get fs() { return this.item.collection.fs; }

  get file_path() { throw new Error('get file_path() not implemented'); }

  /**
   * @property {Object} env - The environment configuration
   * @readonly
   */
  get env() { return this.item.env; }

  /**
   * Converts adapter file format to `item.source_data{}` format
   * @abstract
   * @throws {Error} Must be implemented by subclasses
   */
  to_source_data() { throw new Error('to_source_data() not implemented'); }

  /**
   * Converts `item.source_data{}` format to adapter file format
   * @abstract
   * @throws {Error} Must be implemented by subclasses
   */
  from_source_data(source_data) { throw new Error('from_source_data() not implemented'); }

  async import() {
    const source_data = await this.read();
    if(!source_data) return console.warn('no source data found for', this);
    this.from_source_data(source_data);
  }

  async read() {
    return await this.fs.read(this.file_path);
  }
  async save(){
    this.fs.write(this.file_path, this.to_source_data());
  }

}