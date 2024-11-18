import { SmartEmbedMessageAdapter } from "./_message.js";

export class SmartEmbedIframeAdapter extends SmartEmbedMessageAdapter {
    constructor(model) {
        super(model);
        this.iframe = null;
        this.origin = window.location.origin;
        // this.iframe_id = `smart_embed_iframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.iframe_id = `smart_embed_iframe`;
    }

    async load() {
        // check if iframe already exists
        const existing_iframe = document.getElementById(this.iframe_id);
        if(existing_iframe) {
            // remove existing iframe
            existing_iframe.remove();
        }
        // Create and append iframe
        this.iframe = document.createElement('iframe');
        this.iframe.style.display = 'none';
        this.iframe.id = this.iframe_id;
        // set sandbox attribute
        this.iframe.sandbox = 'allow-scripts allow-same-origin';
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

        const load_opts = {
            ...this.model.opts,
            adapters: null, // cannot clone classes
            settings: null,
            batch_size: this.batch_size,
            use_gpu: this.use_gpu,
        };
        console.log({load_opts});
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

    _post_message(message_data) {
        this.iframe.contentWindow.postMessage({ ...message_data, iframe_id: this.iframe_id }, this.origin);
    }

    _handle_message(event) {
        if (event.origin !== this.origin || event.data.iframe_id !== this.iframe_id) return;
        const { id, result, error } = event.data;
        this._handle_message_result(id, result, error);
    }
}