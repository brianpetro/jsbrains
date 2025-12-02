import { SmartRankMessageAdapter } from "./_message.js";

/**
 * Adapter for running ranking models in an iframe
 * Provides isolation and separate context for model execution.
 * @class SmartRankIframeAdapter
 * @extends SmartRankMessageAdapter
 */
export class SmartRankIframeAdapter extends SmartRankMessageAdapter {
  /**
   * Create iframe adapter instance
   * @param {SmartRankModel} model - Parent model instance
   */
  constructor(model) {
    super(model);
    /** @type {HTMLIFrameElement|null} */
    this.iframe = null;
    /** @type {string} */
    this.origin = (typeof window !== 'undefined') ? window.location.origin : 'http://localhost';
    /** @type {string} */
    this.iframe_id = `smart_rank_iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize iframe and load model
   * @async
   * @returns {Promise<void>}
   */
  async load() {
    if (typeof document === 'undefined') {
      throw new Error('SmartRankIframeAdapter requires a browser environment');
    }

    const existing_iframe = document.getElementById(this.iframe_id);
    if (existing_iframe) existing_iframe.remove();

    // Create and append iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    this.iframe.id = this.iframe_id;
    this.iframe.sandbox = 'allow-scripts allow-same-origin';
    document.body.appendChild(this.iframe);

    // Set up message listener
    window.addEventListener('message', this._handle_window_message.bind(this));

    // Load iframe content
    this.iframe.srcdoc = `
      <html>
        <body>
          <script type="module">
            ${this.connector}
            window.addEventListener('message', async (event) => {
              if (event.origin !== '${this.origin}' || event.data.iframe_id !== '${this.iframe_id}') return;
              const response = await process_message(event.data);
              window.parent.postMessage({ ...response, iframe_id: '${this.iframe_id}' }, '${this.origin}');
            });
          </script>
        </body>
      </html>
    `;

    await new Promise(resolve => this.iframe.onload = resolve);

    const load_opts = {
      model_key: this.model.model_key,
      use_gpu: this.model.data.use_gpu || false,
      adapters: null,
      settings: null,
    };
    await this._send_message('load', load_opts);

    return new Promise(resolve => {
      const check_model_loaded = () => {
        if (this.model.model_loaded) resolve();
        else setTimeout(check_model_loaded, 100);
      };
      check_model_loaded();
    });
  }

  /**
   * Handle messages from the iframe
   * @private
   * @param {MessageEvent} event - Message event
   */
  _handle_window_message(event) {
    if (event.origin !== this.origin || event.data.iframe_id !== this.iframe_id) return;
    const { id, result, error } = event.data;
    this._handle_message_result(id, result, error);
  }

  /**
   * Post message to iframe
   * @protected
   * @param {Object} message_data - Message to send
   */
  _post_message(message_data) {
    this.iframe.contentWindow.postMessage({ ...message_data, iframe_id: this.iframe_id }, this.origin);
  }
}
