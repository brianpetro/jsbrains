import { SmartRankModel } from '../smart_rank_model.js';
import { SmartRankTransformersAdapter } from '../adapters/transformers.js';

let model = null;

/**
 * Process incoming messages and perform ranking.
 * @param {Object} data - Message data containing method, params, id, iframe_id
 * @returns {Promise<Object>} Response containing id, result, and iframe_id
 */
async function process_message(data) {
  const { method, params, id, iframe_id } = data;
  try {
    let result;
    switch (method) {
      case 'init':
        console.log('init');
        break;
      case 'load':
        console.log('load', params);
        model = new SmartRankModel({
          ...params,
          adapters: { transformers: SmartRankTransformersAdapter },
          adapter: 'transformers',
          settings: {}
        });
        await model.load();
        result = { model_loaded: true };
        break;
      case 'rank':
        if (!model) throw new Error('Model not loaded');
        result = await model.rank(params.query, params.documents);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    return { id, result, iframe_id };
  } catch (error) {
    console.error('Error processing message:', error);
    return { id, error: error.message, iframe_id };
  }
}

// Initialize if needed
process_message({ method: 'init' });
