import { SmartRankModel } from '../smart_rank_model.js';
import { SmartRankTransformersAdapter } from '../adapters/transformers.js';

let model = null;
let smart_env = {
  smart_rank_active_models: {},
  opts: {
    smart_rank_adapters: {
      transformers: SmartRankTransformersAdapter
    }
  }
};

/**
 * Process incoming messages and perform ranking.
 * @param {Object} data - Message data containing method, params, id, worker_id
 * @returns {Promise<Object>} Response containing id, result, and worker_id
 */
async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case 'load':
        console.log('load', params);
        if (!model) {
          model = new SmartRankModel({
            ...params,
            adapters: { transformers: SmartRankTransformersAdapter },
            adapter: 'transformers',
            settings: {}
          });
          await model.load();
        }
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
  const response = await process_message(event.data);
  self.postMessage(response);
});

console.log('worker loaded');

// Export process_message for testing purposes
self.process_message = process_message;