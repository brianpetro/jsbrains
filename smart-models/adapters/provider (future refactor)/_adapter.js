export class ProviderAdapter {
  constructor(model_item) {
    this.model_item = model_item;
  }
  async load () {
    this.state = 'loaded';
  }

}