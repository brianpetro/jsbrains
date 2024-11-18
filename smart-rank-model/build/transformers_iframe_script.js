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
}

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
    return { id, result, iframe_id };
  } catch (error) {
    console.error('Error processing message:', error);
    return { id, error: error.message, iframe_id };
  }
}
process_message({ method: 'init' });