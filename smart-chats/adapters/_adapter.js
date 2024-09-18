export class SmartChatDataAdapter {
  constructor(item) {
    this.item = item;
  }
  get data() { return this.item.data; }
  to_chatml() { throw new Error('to_chatml() not implemented'); }
  from_chatml() { throw new Error('from_chatml() not implemented'); }
  async parse() { throw new Error('parse() not implemented'); }
}