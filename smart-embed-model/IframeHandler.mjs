class IframeHandler {
    constructor(base_class, opts) {
        this.base_class = base_class;
        this.opts = opts;
        this.pending_responses = {};
        this.message_counter = 0;

        if (opts.iframe) {
            this.setup_iframe_communication(opts.iframe);
        } else {
            this.setup_message_listener();
        }

        this.add_global_message_listener();
    }

    setup_iframe_communication(iframe) {
        this.opts.active_methods.forEach(method => {
            const original_method = this.base_class[method].bind(this.base_class);
            this.base_class[method] = (...args) => {
                return new Promise((resolve, reject) => {
                    const id = `msg_${Date.now()}_${this.message_counter++}`;
                    this.pending_responses[id] = { resolve, reject };

                    const message = { method, args, id };
                    iframe.contentWindow.postMessage(message, '*');

                    setTimeout(() => {
                        if (this.pending_responses[id]) {
                            this.pending_responses[id].reject(new Error('Iframe response timeout'));
                            delete this.pending_responses[id];
                        }
                    }, 10000); // 10 seconds timeout
                });
            };
            this.base_class[`${method}_original`] = original_method; // Preserve original method
        });
    }

    setup_message_listener() {
        window.addEventListener('message', event => {
            const { method, args, id } = event.data;
            if (this.opts.active_methods.includes(method)) {
                this.base_class[method](...args)
                    .then(result => {
                        window.postMessage({ id, result }, '*');
                    })
                    .catch(error => {
                        window.postMessage({ id, error: error.message }, '*');
                    });
            }
        });
    }

    handle_iframe_response(event) {
        const { id, result, error } = event.data;
        if (this.pending_responses[id]) {
            if (error) {
                this.pending_responses[id].reject(new Error(error));
            } else {
                this.pending_responses[id].resolve(result);
            }
            delete this.pending_responses[id];
        }
    }

    add_global_message_listener() {
        window.addEventListener('message', event => {
            if (event.data && event.data.id) { // Ensure the event contains a valid message ID
                if (IframeHandler.instance) {
                    IframeHandler.instance.handle_iframe_response(event);
                }
            }
        });
    }
}

export { IframeHandler };
