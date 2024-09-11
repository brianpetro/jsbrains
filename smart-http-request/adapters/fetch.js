import { SmartHttpRequestAdapter, SmartHttpResponseAdapter } from "./_adapter.js";
export class SmartHttpFetchAdapter extends SmartHttpRequestAdapter {
  async request(url, opts={}) {
    return new SmartHttpFetchResponseAdapter(await fetch(url, opts));
  }
}
export class SmartHttpFetchResponseAdapter extends SmartHttpResponseAdapter {
  async headers() { return this.response.headers; }
  async json() { return await this.response.json(); }
  async status() { return this.response.status; }
  async text() { return await this.response.text(); }
}