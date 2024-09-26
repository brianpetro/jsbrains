import { SmartEmbedAdapter } from "./_adapter.js";

export class SmartEmbedWorkerAdapter extends SmartEmbedAdapter {
  constructor(smart_embed) {
    super(smart_embed);
    this.worker = null;
    this.message_queue = {};
    this.message_id = 0;
    this.connector = null; // override in subclass
    this.worker_id = `smart_embed_worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.message_prefix = `msg_${Math.random().toString(36).substr(2, 9)}_`;
  }
  get main() { return this.smart_embed.env.main; }

  async load() {
    console.log('loading worker adapter', this.smart_embed.opts);

    const global_key = `smart_embed_worker_${this.smart_embed.opts.embed_model_key}`;
    
    if (!this.main[global_key]) {
      this.main[global_key] = new Worker(this.worker_url, { type: 'module' });
      console.log('new worker created', this.main[global_key]);
    }
    
    this.worker = this.main[global_key];
    console.log('worker', this.worker);
    console.log('worker_url', this.worker_url);

    // Set up message listener
    this.worker.addEventListener('message', this._handle_message.bind(this));

    // Initialize the model in the worker
    await this._send_message('load', { ...{...this.smart_embed.opts, adapters: null, settings: null}, worker_id: this.worker_id });
    await new Promise(resolve => {
      const check_model_loaded = () => {
        console.log('check_model_loaded', this.smart_embed.model_loaded);
        if (this.smart_embed.model_loaded) {
          resolve();
        } else {
          setTimeout(check_model_loaded, 100);
        }
      };
      check_model_loaded();
    });
    console.log('model loaded');
  }

  async _send_message(method, params) {
    return new Promise((resolve, reject) => {
      const id = `${this.message_prefix}${this.message_id++}`;
      this.message_queue[id] = { resolve, reject };
      this.worker.postMessage({ method, params, id, worker_id: this.worker_id });
    });
  }

  _handle_message(event) {
    const { id, result, error, worker_id } = event.data;
    if (worker_id !== this.worker_id) return;
    if (!id.startsWith(this.message_prefix)) return;

    if (result?.model_loaded) {
      console.log('model loaded');
      this.smart_embed.model_loaded = true;
    }
    if (this.message_queue[id]) {
      if (error) {
        this.message_queue[id].reject(new Error(error));
      } else {
        this.message_queue[id].resolve(result);
      }
      delete this.message_queue[id];
    }
  }

  async count_tokens(input) {
    return this._send_message('count_tokens', { input });
  }

  async embed_batch(inputs) {
    const filtered_inputs = inputs.filter(item => item.embed_input?.length > 0);
    if (!filtered_inputs.length) return [];
    const embed_inputs = filtered_inputs.map(item => ({ embed_input: item.embed_input }));
    const result = await this._send_message('embed_batch', { inputs: embed_inputs });

    return filtered_inputs.map((item, i) => {
      item.vec = result[i].vec;
      item.tokens = result[i].tokens;
      return item;
    });
  }
}
