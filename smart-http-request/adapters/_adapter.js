export class SmartHttpRequestAdapter {
  constructor(main) {
    this.main = main;
  }
  async request(url, opts={}) { throw new Error("request not implemented"); }
}

export class SmartHttpResponseAdapter {
  constructor(response) {
    this.response = response;
  }
  async headers() { throw new Error("headers not implemented"); }
  async json() { throw new Error("json not implemented"); }
  async status() { throw new Error("status not implemented"); }
  async text() { throw new Error("text not implemented"); }
}