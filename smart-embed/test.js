
const test = require('ava');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { SmartEmbedTransformersNodeAdapter } = require('./smart_embed');
test('SmartEmbedTransformersNodeAdapter.embed(input)-> returns an object with tokens and vec', async (t) => {
  const smart_embed = await SmartEmbedTransformersNodeAdapter.create("TaylorAI/bge-micro-v2");
  const resp = await smart_embed.embed("test");
  t.is(resp.tokens, 3);
  t.is(resp.vec.length, 384);
});
test('SmartEmbedTransformersNodeAdapter.embed_batch(items)-> returns an array of objects with tokens and vec', async (t) => {
  const smart_embed = await SmartEmbedTransformersNodeAdapter.create("TaylorAI/bge-micro-v2");
  const test_items = [
    { embed_input: "test" },
    { embed_input: "test" },
  ];
  const resp = await smart_embed.embed_batch(test_items);
  // console.log(resp);
  t.is(resp[0].tokens, 3);
  t.is(resp[0].vec.length, 384);
  t.is(resp[1].tokens, 3);
  t.is(resp[1].vec.length, 384);
});
test('SmartEmbedTransformersNodeAdapter.embed_batch(similar_items)-> returns similar vectors', async (t) => {
  const { cos_sim } = await import("@xenova/transformers");
  const smart_embed = await SmartEmbedTransformersNodeAdapter.create("Xenova/jina-embeddings-v2-base-zh-8192");
  const similar_items = [
    { embed_input: "How is the weather today?"},
    { embed_input: "今天天气怎么样?"},  // same meaning in Chinese
  ];
  const resp = await smart_embed.embed_batch(similar_items);
  const similarity = cos_sim(resp[0].vec, resp[1].vec);
  t.true(similarity > 0.7, "The similarity of the two similar inputs should be high");
});
// test jina-8k
test('SmartEmbedTransformersNodeAdapter.embed_batch(jina-8k)-> returns similar vectors', async (t) => {
  const { cos_sim } = await import("@xenova/transformers");
  const smart_embed = await SmartEmbedTransformersNodeAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
  const similar_items = [
    { embed_input: "How is the weather today?"},
    { embed_input: "What is the weather like today?"},  // same meaning in English
  ];
  const resp = await smart_embed.embed_batch(similar_items);
  const similarity = cos_sim(resp[0].vec, resp[1].vec);
  t.true(similarity > 0.7, "The similarity of the two similar inputs should be high");
});
// jina 8k should work with long text
test('SmartEmbedTransformersNodeAdapter.embed_batch(jina-8k)-> returns similar vectors for long text', async (t) => {
  const { cos_sim } = await import("@xenova/transformers");
  const smart_embed = await SmartEmbedTransformersNodeAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
  const similar_items = [
    // 20000 characters
    { embed_input: "How is the weather today?".repeat(1000)},
    { embed_input: "What is the weather like today?".repeat(500)},
  ];
  // count tokens
  const tokens = await smart_embed.count_tokens(similar_items[0].embed_input);
  console.log(tokens);
  const resp = await smart_embed.embed_batch(similar_items);
  const similarity = cos_sim(resp[0].vec, resp[1].vec);
  t.true(similarity > 0.7, "The similarity of the two similar inputs should be high");
});
const { SmartEmbedOpenAIAdapter } = require('./smart_embed');
test('SmartEmbedOpenAIAdapter.embed(input)-> returns an object with tokens and vec', async (t) => {
  const smart_embed = await SmartEmbedOpenAIAdapter.create("text-embedding-3-small-512", fetch, process.env.OPENAI_API_KEY, { url_first: true });
  const resp = await smart_embed.embed("test");
  t.is(resp.tokens, 1);
  t.is(resp.vec.length, 512);
});
test('SmartEmbedOpenAIAdapter.embed_batch(items)-> returns an array of objects with tokens and vec', async (t) => {
  const smart_embed = await SmartEmbedOpenAIAdapter.create("text-embedding-3-small-512", fetch, process.env.OPENAI_API_KEY, { url_first: true });
  const test_items = [
    { embed_input: "test" },
    { embed_input: "test" },
  ];
  const resp = await smart_embed.embed_batch(test_items);
  // console.log(resp);
  t.is(resp[0].tokens, 1);
  t.is(resp[0].vec.length, 512);
  t.is(resp[1].tokens, 1);
  t.is(resp[1].vec.length, 512);
});