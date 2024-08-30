import { SmartRankModel } from '../smart_rank_model.js';
import { SmartRankTransformersAdapter } from '../adapters/transformers.js';

let model = null;
let smart_env = {
  smart_embed_active_models: {},
  opts: {
    smart_embed_adapters: {
      transformers: SmartRankTransformersAdapter
    }
  }
}

async function process_message(data) {
    const { method, params, id, worker_id } = data;
    try {
        let result;
        switch (method) {
            case 'load':
                console.log('load', params);
                model = await SmartRankModel.load(smart_env, { adapter: 'transformers', model_key: params.model_key, ...params });
                result = { model_loaded: true };
                break;
            case 'rank':
                if (!model) throw new Error('Model not loaded');
                result = await model.rank(params.query, params.documents);
                break;
            default:
                throw new Error(`Unknown method: ${method}`);
        }
        return { id, result, worker_id };
    } catch (error) {
        console.error('Error processing message:', error);
        return { id, error: error.message, worker_id };
    }
}

self.addEventListener('message', async (event) => {
  console.log('message', event.data);
    const response = await process_message(event.data);
    self.postMessage(response);
});
console.log('worker loaded');

// Export process_message for testing purposes
self.process_message = process_message;