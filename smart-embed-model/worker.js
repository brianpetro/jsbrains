const { parentPort: self } = require('worker_threads');
const { SmartEmbedModel } = require('./smart_embed_model');

let model = null;

self.addEventListener('message', async (event) => {
  console.debug('Received message (worker):', event.data);
  switch (event.data.type) {
    case 'init':
      console.debug('Initializing model with config:', event.data.model_config);
      await initialize_model(event.data.env, event.data.model_config);
      break;
    case 'embed':
      console.debug('Handling embed with data:', event.data);
      await handle_embed(event.data);
      break;
    case 'embed_batch':
      console.debug('Handling embed batch with data:', event.data);
      await handle_embed_batch(event.data);
      break;
    case 'token_count':
      console.debug('Handling token count with data:', event.data);
      await handle_token_count(event.data);
      break;
    default:
      console.warn('Unknown message type:', event.data.type);
  }
});

async function initialize_model(env, model_config) {
  if (model) {
    console.log("Model already initialized.");
    return;
  }
  console.log("Initializing model...");
  model = await SmartEmbedModel.create(env, {...model_config, adapter: 'transformers'});
  console.debug('Model initialized.');
  self.postMessage({ type: "model_loaded", data: true });
}

async function handle_embed({ embed_input, handler_id }) {
  if (!model) {
    console.error("Model not initialized.");
    return;
  }
  console.debug('Embedding input:', embed_input);
  const response = await model.embed(embed_input);
  const send_data = {
    type: "embed_resp",
    handler_id,
    data: response,
  };
  console.debug('Sending embed response:', send_data);
  self.postMessage(send_data);
}

async function handle_embed_batch({ embed_input, handler_id }) {
  if (!model) {
    console.error("Model not initialized.");
    return;
  }
  console.debug('Embedding batch input:', embed_input);
  const response = await model.embed_batch(embed_input);
  console.debug('Embed batch response:', response);
  const send_data = {
    type: "embed_batch_resp",
    handler_id,
    data: response,
  };
  console.debug('Sending embed batch response:', send_data);
  self.postMessage(send_data);
}

async function handle_token_count({ embed_input, handler_id }) {
  if (!model) {
    console.error("Model not initialized.");
    return;
  }
  console.debug('Counting tokens for input:', embed_input);
  const token_count = await model.count_tokens(embed_input);
  const send_data = {
    type: "token_count_resp",
    handler_id,
    count: token_count
  };
  console.debug('Sending token count response:', send_data);
  self.postMessage(send_data);
}
