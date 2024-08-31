import { SmartRankAdapter } from "./_adapter.js";

export class SmartRankWorkerAdapter extends SmartRankAdapter {
  constructor(smart_rank) {
    super(smart_rank);
    this.worker = null;
    this.message_queue = {};
    this.message_id = 0;
    this.connector = null; // override in subclass
    this.worker_id = `smart_rank_worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async load() {
    console.log('loading worker adapter', this.smart_rank.opts);

    // Create worker using a relative path
    const worker_url = new URL(this.connector, import.meta.url);
    this.worker = new Worker(worker_url, { type: 'module' });
    console.log('worker', this.worker);


    // Set up message listener
    this.worker.addEventListener('message', this._handle_message.bind(this));

    // Initialize the model in the worker
    await this._send_message('load', { ...this.smart_rank.opts, worker_id: this.worker_id });
    await new Promise(resolve => {
      const check_model_loaded = () => {
        console.log('check_model_loaded', this.smart_rank.model_loaded);
        if (this.smart_rank.model_loaded) {
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
      const id = this.message_id++;
      this.message_queue[id] = { resolve, reject };
      this.worker.postMessage({ method, params, id, worker_id: this.worker_id });
    });
  }

  _handle_message(event) {
    console.log('handle_message', event.data);
    const { id, result, error, worker_id } = event.data;
    if (worker_id !== this.worker_id) return;

    if (result?.model_loaded) {
      console.log('model loaded');
      this.smart_rank.model_loaded = true;
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

  async rank(query, documents) {
    return this._send_message('rank', { query, documents });
  }

}
