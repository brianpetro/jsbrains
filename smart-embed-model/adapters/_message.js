import { SmartEmbedAdapter } from "./_adapter.js";

/**
 * Base adapter for message-based embedding implementations (iframe/worker)
 * Handles communication between main thread and isolated contexts
 * @extends SmartEmbedAdapter
 * 
 * @example
 * ```javascript
 * class MyMessageAdapter extends SmartEmbedMessageAdapter {
 *   _post_message(message_data) {
 *     // Implement message posting logic
 *   }
 * }
 * ```
 */
export class SmartEmbedMessageAdapter extends SmartEmbedAdapter {
    /**
     * Create message adapter instance
     */
    constructor(model) {
        super(model);
        /**
         * Queue of pending message promises
         * @type {Object.<string, {resolve: Function, reject: Function}>}
         * @private
         */
        this.message_queue = {};
        
        /** 
         * Counter for message IDs
         * @type {number}
         * @private
         */
        this.message_id = 0;
        
        /** 
         * Message connector implementation
         * @type {string|null}
         * @protected
         */
        this.connector = null;
        
        /** 
         * Unique prefix for message IDs
         * @type {string}
         * @private
         */
        this.message_prefix = `msg_${Math.random().toString(36).substr(2, 9)}_`;
    }

    /**
     * Send message and wait for response
     * @protected
     * @param {string} method - Method name to call
     * @param {Object} params - Method parameters
     * @returns {Promise<any>} Response data
     */
    async _send_message(method, params) {
        return new Promise((resolve, reject) => {
            const id = `${this.message_prefix}${this.message_id++}`;
            this.message_queue[id] = { resolve, reject };
            this._post_message({ method, params, id });
        });
    }

    /**
     * Handle response message from worker/iframe
     * @protected
     * @param {string} id - Message ID
     * @param {*} result - Response result
     * @param {Error} [error] - Response error
     */
    _handle_message_result(id, result, error) {
        if (!id.startsWith(this.message_prefix)) return;

        if (result?.model_loaded) {
            console.log('model loaded');
            this.state = 'loaded';
            this.model.model_loaded = true; // DEPRECATED
            this.model.load_result = result;
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

    /**
     * Count tokens in input text
     * @param {string} input - Text to tokenize
     * @returns {Promise<Object>} Token count result
     */
    async count_tokens(input) {
        return this._send_message('count_tokens', { input });
    }

    /**
     * Generate embeddings for multiple inputs
     * @param {Array<Object>} inputs - Array of input objects
     * @returns {Promise<Array<Object>>} Processed inputs with embeddings
     */
    async embed_batch(inputs) {
        inputs = inputs.filter(item => item.embed_input?.length > 0);
        if (!inputs.length) return [];
        const embed_inputs = inputs.map(item => ({ embed_input: item.embed_input }));
        const result = await this._send_message('embed_batch', { inputs: embed_inputs });

        return inputs.map((item, i) => {
            item.vec = result[i].vec;
            item.tokens = result[i].tokens;
            return item;
        });
    }

    /**
     * Post message to worker/iframe
     * @abstract
     * @protected
     * @param {Object} message_data - Message to send
     * @throws {Error} If not implemented by subclass
     */
    _post_message(message_data) {
        throw new Error('_post_message must be implemented by subclass');
    }
} 