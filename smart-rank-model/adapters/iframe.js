import { SmartRankModelAdapter } from "./_adapter.js";

export class SmartRankIframeAdapter extends SmartRankModelAdapter {
  constructor(smart_rank) {
    super(smart_rank);
    this.iframe = null;
    this.message_queue = {};
    this.message_id = 0;
    this.connector = null; // override in subclass
    this.origin = window.location.origin;
    this.iframe_id = `smart_rank_iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async load() {
    // Create and append iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    this.iframe.id = this.iframe_id;
    document.body.appendChild(this.iframe);

    // Set up message listener
    window.addEventListener('message', this._handle_message.bind(this));

    // Load the iframe content
    this.iframe.srcdoc = `
          <html>
            <body>
              <script type="module">
                ${this.connector}
                // Set up a message listener in the iframe
                window.addEventListener('message', async (event) => {
                    if (event.origin !== '${this.origin}' || event.data.iframe_id !== '${this.iframe_id}') return console.log('message ignored (listener)', event);
                    // Process the message and send the response back
                    const response = await process_message(event.data);
                    window.parent.postMessage({ ...response, iframe_id: '${this.iframe_id}' }, '${this.origin}');
                });
              </script>
            </body>
          </html>
        `;

    // Wait for iframe to load
    await new Promise(resolve => this.iframe.onload = resolve);

    // Initialize the model in the iframe
    await this._send_message('load', this.smart_rank.opts);
    return new Promise(resolve => {
      const check_model_loaded = () => {
        if (this.smart_rank.model_loaded) {
          resolve();
        } else {
          setTimeout(check_model_loaded, 100);
        }
      };
      check_model_loaded();
    });
  }

  async _send_message(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.message_id++;
      this.message_queue[id] = { resolve, reject };
      this.iframe.contentWindow.postMessage({ method, params, id, iframe_id: this.iframe_id }, this.origin);
    });
  }

  _handle_message(event) {
    if (event.origin !== this.origin || event.data.iframe_id !== this.iframe_id) return;

    const { id, result, error } = event.data;
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