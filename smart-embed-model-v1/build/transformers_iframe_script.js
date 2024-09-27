import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';

let model = null;
let smart_env = {
  smart_embed_active_models: {},
  opts: {
    modules: {
      smart_embed_model: {
        adapters: {
          transformers: SmartEmbedTransformersAdapter
        }
      }
    }
  }
}

async function processMessage(data) {
  const { method, params, id, iframe_id } = data;
  try {
    let result;
    switch (method) {
      case 'init':
        console.log('init');
        break;
      case 'load':
        console.log('load', params);
        model = new SmartEmbedModel(smart_env, { ...params, adapters: { transformers: SmartEmbedTransformersAdapter }, adapter: 'transformers' });
        await model.load();
        result = { model_loaded: true };
        break;
      case 'embed_batch':
        if (!model) throw new Error('Model not loaded');
        result = await model.embed_batch(params.inputs);
        break;
      case 'count_tokens':
        if (!model) throw new Error('Model not loaded');
        result = await model.count_tokens(params);
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
processMessage({ method: 'init' });