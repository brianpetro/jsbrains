
const test = require('ava');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { SmartEmbedModel } = require('./smart_embed_model');


test('should work with local_api models', async t => {
  const config = {
    model_key: 'TaylorAI/bge-micro-v2',
    adapter: 'local_api',
    local_endpoint: 'http://localhost:37421/embed_batch',
  };
  const model = await SmartEmbedModel.create({}, config);
  // const embedding = await model.embed_batch([{embed_input: 'The quick brown fox jumps over the lazy dog'}]);
  const embedding = await model.embed('The quick brown fox jumps over the lazy dog');
  t.is(typeof embedding.vec, 'object');
  t.is(embedding.vec.length, model.config.dims);
  t.is(embedding.tokens, 11);
});

test('should work with transformers models', async t => {
  const config = {
    model_key: 'TaylorAI/bge-micro-v2',
    adapter: 'transformers',
  };
  const model = await SmartEmbedModel.create({}, config);
  const embedding = await model.embed('The quick brown fox jumps over the lazy dog');
  t.is(typeof embedding.vec, 'object');
  t.is(embedding.vec.length, model.config.dims);
  t.is(embedding.tokens, 11);
});