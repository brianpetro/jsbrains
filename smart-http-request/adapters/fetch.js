import { SmartHttpRequestAdapter, SmartHttpResponseAdapter } from "./_adapter.js";

export class SmartHttpRequestFetchAdapter extends SmartHttpRequestAdapter {
  async request(request_params) {
    const { url, ...opts } = request_params;
    const resp = await fetch(url, opts);
    return new SmartHttpResponseFetchAdapter(resp);
  }
}
export class SmartHttpResponseFetchAdapter extends SmartHttpResponseAdapter {
  async headers() { return this.response.headers; }
  async json() {
    if(!this._json) {
      this._json = await this.response.json();
    }
    return this._json;
  }
  async status() { return this.response.status; }
  async text() {
    if(!this._text) {
      this._text = await this.response.text();
    }
    return this._text;
  }
}