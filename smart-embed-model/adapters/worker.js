import { SmartEmbedMessageAdapter } from "./_message.js";

/**
 * Adapter for running embedding models in a Web Worker
 * Provides parallel processing in a separate thread
 * @extends SmartEmbedMessageAdapter
 * 
 * @example
 * ```javascript
 * const model = new SmartEmbedModel({
 *   adapters: { worker: SmartEmbedWorkerAdapter }
 * });
 * ```
 */
export class SmartEmbedWorkerAdapter extends SmartEmbedMessageAdapter {
    /**
     * Create worker adapter instance
     * @param {SmartEmbedModel} model - Parent model instance
     */
    constructor(model) {
        super(model);
        /** @type {Worker|null} Web Worker instance */
        this.worker = null;
        /** @type {string} Unique worker identifier */
        this.worker_id = `smart_embed_worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize worker and load model
     * @returns {Promise<void>}
     */
    async load() {
        const global_key = `smart_embed_worker_${this.model.model_key}`;
        
        if (!this.model[global_key]) {
            this.model[global_key] = new Worker(this.worker_url, { type: 'module' });
            console.log('new worker created', this.model[global_key]);
        }
        
        this.worker = this.model[global_key];
        console.log('worker', this.worker);
        console.log('worker_url', this.worker_url);

        // Set up message listener
        this.worker.addEventListener('message', this._handle_message.bind(this));

        // Initialize the model in the worker
        await this._send_message('load', { ...{model_key: this.model.model_key, adapters: null, settings: null}, worker_id: this.worker_id });
        await new Promise(resolve => {
            const check_model_loaded = () => {
                console.log('check_model_loaded', this.model.model_loaded);
                if (this.model.model_loaded) {
                    resolve();
                } else {
                    setTimeout(check_model_loaded, 100);
                }
            };
            check_model_loaded();
        });
        console.log('model loaded');
    }

    /**
     * Post message to worker
     * @protected
     * @param {Object} message_data - Message to send
     */
    _post_message(message_data) {
        this.worker.postMessage({ ...message_data, worker_id: this.worker_id });
    }

    /**
     * Handle message from worker
     * @private
     * @param {MessageEvent} event - Message event
     */
    _handle_message(event) {
        const { id, result, error, worker_id } = event.data;
        if (worker_id !== this.worker_id) return;
        this._handle_message_result(id, result, error);
    }
}
