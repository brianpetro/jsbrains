import test from 'ava';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';

test.before(async t => {
  t.context.model = new SmartEmbedModel({
    settings: {
      model_key: 'TaylorAI/bge-micro-v2',
    },
    adapters: {
      transformers: SmartEmbedTransformersAdapter,
    },
  });
  await t.context.model.load();
});

test('init', t => {
  t.true(t.context.model.adapter instanceof SmartEmbedTransformersAdapter);
});

test('count_tokens', async t => {
  const result = await t.context.model.adapter.count_tokens('Hello, world!');
  t.is(result.tokens, 6);
});

// ... other tests ...