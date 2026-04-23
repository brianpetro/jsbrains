import { SmartEmbedMessageAdapter } from "./_message.js";

/**
 * Adapter for running embedding models in an iframe
 * Provides isolation and separate context for model execution
 * @extends SmartEmbedMessageAdapter
 */
export class SmartEmbedIframeAdapter extends SmartEmbedMessageAdapter {
    /**
     * Create iframe adapter instance
     */
    constructor(model) {
        super(model);
        /** @type {HTMLIFrameElement|null} */
        this.iframe = null;
        /** @type {string} */
        this.origin = window.location.origin;
        /** @type {string} */
        this.iframe_id = `smart_embed_iframe`;
        this._bound_handle_message = this._handle_message.bind(this);
    }

    /**
     * Initialize iframe and load model
     * @returns {Promise<void>}
     */
    async load() {
        this.unload();
        // check if iframe already exists
        const existing_iframe = document.getElementById(this.iframe_id);
        if(existing_iframe) {
            // remove existing iframe
            existing_iframe.onload = null;
            existing_iframe.remove();
        }
        // Create and append iframe
        this.iframe = document.createElement('iframe');
        this.iframe.style.display = 'none';
        this.iframe.id = this.iframe_id;
        document.body.appendChild(this.iframe);
        // Set up message listener
        window.addEventListener('message', this._bound_handle_message);

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

        const load_opts = {
            // ...this.model.opts,
            model_key: this.model.model_key,
            adapters: null, // cannot clone classes
            settings: null,
            batch_size: this.batch_size,
            use_gpu: this.use_gpu,
        };
        // console.log({load_opts});
        // Initialize the model in the iframe
        await this._send_message('load', load_opts);

        return new Promise(resolve => {
            const check_model_loaded = () => {
                if (this.model.model_loaded) {
                    resolve();
                } else {
                    setTimeout(check_model_loaded, 100);
                }
            };
            check_model_loaded();
        });
    }

    /**
     * Detect expected cancellation caused by tearing down the iframe adapter
     * while a background load is in flight.
     * @param {Error|*} error
     * @returns {boolean}
     */
    is_unload_error(error) {
        return error?.message === 'Message adapter unloaded';
    }

    /**
     * Start loading in the background and suppress only expected unload
     * cancellation from fire-and-forget call sites.
     * @returns {Promise<void>}
     */
    load_background() {
        if (this._load_background_promise) {
            return this._load_background_promise;
        }

        this._load_background_promise = Promise.resolve(this.load())
            .catch((error) => {
                if (this.is_unload_error(error)) return;
                console.error(`[${this.constructor.name}] load failed`, error);
            })
            .finally(() => {
                this._load_background_promise = null;
            })
        ;

        return this._load_background_promise;
    }

    unload() {
        window.removeEventListener('message', this._bound_handle_message);
        const iframe = this.iframe || document.getElementById(this.iframe_id);
        if (iframe) {
            iframe.onload = null;
            iframe.remove();
        }
        this.iframe = null;
        if (this.model) {
            this.model.model_loaded = false;
            this.model.load_result = null;
        }
        super.unload();
    }

    /**
     * Post message to iframe
     * @protected
     * @param {Object} message_data - Message to send
     */
    _post_message(message_data) {
        if (!this.iframe?.contentWindow) {
            throw new Error('Iframe not loaded');
        }
        this.iframe.contentWindow.postMessage({ ...message_data, iframe_id: this.iframe_id }, this.origin);
    }

    /**
     * Handle message from iframe
     * @private
     * @param {MessageEvent} event - Message event
     */
    _handle_message(event) {
        if (event.origin !== this.origin || event.data?.iframe_id !== this.iframe_id) return;
        if (event.source !== this.iframe?.contentWindow) return;
        const { id, result, error } = event.data;
        this._handle_message_result(id, result, error);
    }
}
