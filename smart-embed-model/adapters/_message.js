import { SmartEmbedAdapter } from "./_adapter.js";

export class SmartEmbedMessageAdapter extends SmartEmbedAdapter {
    constructor(model) {
        super(model);
        this.message_queue = {};
        this.message_id = 0;
        this.connector = null; // override in subclass
        this.message_prefix = `msg_${Math.random().toString(36).substr(2, 9)}_`;
    }

    async _send_message(method, params) {
        return new Promise((resolve, reject) => {
            const id = `${this.message_prefix}${this.message_id++}`;
            this.message_queue[id] = { resolve, reject };
            this._post_message({ method, params, id });
        });
    }

    _handle_message_result(id, result, error) {
        if (!id.startsWith(this.message_prefix)) return;

        if (result?.model_loaded) {
            console.log('model loaded');
            this.model.model_loaded = true;
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

    // Abstract methods to be implemented by subclasses
    _post_message(message_data) {
        throw new Error('_post_message must be implemented by subclass');
    }
} 