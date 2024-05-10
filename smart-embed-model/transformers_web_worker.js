self.addEventListener('message', async (event) => {
  switch (event.data.type) {
    case 'init':
      await initializeModel(event.data.model_config);
      break;
    case 'smart_embed':
      await handleEmbed(event.data);
      break;
    case 'smart_embed_token_ct':
      await handleTokenCount(event.data);
      break;
  }
});

let model = null;
let tokenizer = null;
let embed_ct = 0;
let tokens = 0;
let timestamp = null;

async function initializeModel(model_config) {
  if (model) {
    console.log("Model already initialized.");
    return;
  }
  console.log("Initializing model...");
  const { pipeline, env, AutoTokenizer } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@latest');
  env.allowLocalModels = false;
  model = await pipeline('feature-extraction', model_config.model_name, { quantized: true });
  tokenizer = await AutoTokenizer.from_pretrained(model_config.model_name);
  self.postMessage({ type: "model_loaded", data: true });
}

async function handleEmbed({ embed_input, handler_id }) {
  if (!model) {
    console.error("Model not initialized.");
    return;
  }
  if (!timestamp) timestamp = Date.now();
  const response = Array.isArray(embed_input) ? await embedBatch(embed_input) : await embed(embed_input);
  const send_data = {
    type: "smart_embed_resp",
    handler_id,
    data: response,
  };
  self.postMessage(send_data);
  updateStats(response);
}

async function embed(input) {
  const result = await model({ inputs: input });
  return { result, tokens: tokenizer.countTokens(input) };
}

async function embedBatch(inputs) {
  const results = await Promise.all(inputs.map(input => embed(input)));
  return results;
}

async function handleTokenCount({ embed_input }) {
  if (!tokenizer) {
    console.error("Tokenizer not initialized.");
    return;
  }
  const tokenCount = tokenizer.countTokens(embed_input);
  self.postMessage({
    type: "smart_embed_token_ct",
    text: "count:" + embed_input,
    count: tokenCount
  });
}

function updateStats(response) {
  const newTokens = Array.isArray(response) ? response.reduce((acc, item) => acc + item.tokens, 0) : response.tokens;
  tokens += newTokens;
  embed_ct += Array.isArray(response) ? response.length : 1;
  if (Date.now() - timestamp > 10000) {
    console.log(`Embedded: ${embed_ct} inputs (${tokens} tokens, ${(tokens / ((Date.now() - timestamp) / 1000)).toFixed(0)} tokens/sec)`);
    timestamp = null;
    tokens = 0;
    embed_ct = 0;
  }
}
