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
let processing_message = false;

async function process_message(data) {
  const { method, params, id, worker_id } = data;
  try {
    let result;
    switch (method) {
      case 'load':
        console.log('load', params);
        if(!model) {
          model = new SmartEmbedModel({
            ...params,
            adapters: { transformers: SmartEmbedTransformersAdapter },
            adapter: 'transformers',
            settings: {}
          });
          await model.load();
        }
        result = { model_loaded: true };
        break;
      case 'unload':
        console.log('unload', params);
        if(model) {
          await model.unload();
          model = null;
        }
        result = { model_unloaded: true };
        break;
      case 'embed_batch':
        if (!model) throw new Error('Model not loaded');
        // wait until finished processing previous message
        if (processing_message) while (processing_message) await new Promise(resolve => setTimeout(resolve, 100));
        processing_message = true;
        result = await model.embed_batch(params.inputs);
        processing_message = false;
        break;
      case 'count_tokens':
        if (!model) throw new Error('Model not loaded');
        // wait until finished processing previous message
        if (processing_message) while (processing_message) await new Promise(resolve => setTimeout(resolve, 100));
        processing_message = true;
        result = await model.count_tokens(params);
        processing_message = false;
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