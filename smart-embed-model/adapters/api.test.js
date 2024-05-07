const test = require('ava');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { SmartEmbedModel } = require('../smart_embed_model');

const config = {
  model_key: 'text-embedding-3-small',
  api_key: process.env.OPENAI_API_KEY,
};
// test('should work with OpenAI API models', async t => {
//   const model = new SmartEmbedModel({}, config);
//   const embedding = await model.embed('The quick brown fox jumps over the lazy dog');
//   t.is(typeof embedding.vec, 'object');
//   t.is(embedding.vec.length, model.config.dims);
//   t.is(embedding.tokens, 9);
// });


test('should count tokens', async t => {
  const model = new SmartEmbedModel({}, config);
  const tokens = await model.count_tokens('The quick brown fox jumps over the lazy dog');
  t.is(tokens, 9);
});


test('should handle batch where item exceeds max length', async t => {
  // generate batch of items, 1 of which exceeds the max length (100K chars)
  const exceeding_item = 'a b c'.repeat(30000);
  const batch = [exceeding_item, 'a'.repeat(1000)];
  const model = new SmartEmbedModel({}, config);
  const embeddings = await model.embed_batch(batch.map(item => ({embed_input: item})));
  t.is(embeddings.length, 2);
});