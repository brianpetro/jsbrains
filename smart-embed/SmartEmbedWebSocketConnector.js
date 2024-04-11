const { SmartEmbed } = require('./SmartEmbed');
const { SmartSocket } = require('./smart_socket');
class SmartEmbedSocket extends SmartSocket {
  constructor(port, model_config) {
    super(port);
    this.model_config = model_config;
    this.handlers = {};
  }
  handle_message(event) {
    const data = JSON.parse(event.data);
    if (data.id && this.handlers[data.id]) {
      this.handlers[data.id](data);
      delete this.handlers[data.id];
    }
  }
  send(data) {
    if(typeof data !== 'object') return console.error('Data must be an object');
    data.model_config = this.model_config; 
    data = JSON.stringify(data);
    this.ws.send(data);
  }
}


class SmartEmbedWebSocketConnector extends SmartEmbed {
  async init() {
    this.ws = new SmartEmbedSocket(42424, this.config);
    await this.ws.connect(false); // no retry on initial connect
    this.ws.send({ type: 'init', model_config: this.config });
  }
  unload(){
    if(this.ws) this.ws.unload();
  }
  async embed_batch(items) {
    items = items.filter(item => item.embed_input?.length > 0);
    if (!items?.length) return [];
    const resp = await this.request_embedding('embed_batch', items.map(item => ({ embed_input: item.embed_input })));
    return items.map((item, i) => {
      const resp_item = resp[i];
      item.vec = resp_item.vec;
      item.tokens = resp_item.tokens;
      return item;
    });
  }
  embed(input) { return this.request_embedding('embed', input); }
  count_tokens(input) { return this.request_embedding('count_tokens', input); }
  request_embedding(type, input) {
    if(!this.ws) throw new Error('Websocket not connected');
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      if(!this.ws.handlers) this.ws.handlers = {};
      this.ws.handlers[id] = data => {
        if (data.error) {
          reject(data);
        } else {
          resolve(data);
        }
      };
      this.ws.send({type, input, id});
    });
  }
}
exports.SmartEmbedWebSocketConnector = SmartEmbedWebSocketConnector;