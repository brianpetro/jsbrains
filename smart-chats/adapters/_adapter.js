/**
 * @class SmartChatDataAdapter
 * @description Base adapter class for chat data format conversions.
 * Provides interface for converting between internal format and various chat formats.
 */
export class SmartChatDataAdapter {
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

  /**
   * @property {Object} env - The environment configuration
   * @readonly
   */
  get env() { return this.item.env; }

  /**
   * Converts internal format to ChatML format
   * @abstract
   * @throws {Error} Must be implemented by subclasses
   */
  to_chatml() { throw new Error('to_chatml() not implemented'); }

  /**
   * Converts ChatML format to internal format
   * @abstract
   * @throws {Error} Must be implemented by subclasses
   */
  from_chatml() { throw new Error('from_chatml() not implemented'); }

  /**
   * Parses raw data into internal format
   * @abstract
   * @async
   * @throws {Error} Must be implemented by subclasses
   */
  async parse() { throw new Error('parse() not implemented'); }
}