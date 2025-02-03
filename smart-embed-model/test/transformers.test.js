import test from 'ava';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';
import expected from './transformers.json' with { type: 'json' };


// Mock the transformers pipeline
class MockSmartEmbedTransformersAdapter extends SmartEmbedTransformersAdapter {
}

test.beforeEach(async t => {
  const model = new SmartEmbedModel({
    settings: {
      model_key: 'TaylorAI/bge-micro-v2',
    },
    adapters: {
      transformers: MockSmartEmbedTransformersAdapter,
    },
  });
  await model.initialize();
  t.context.model = model;
});

test('init', t => {
  t.true(t.context.model.adapter instanceof MockSmartEmbedTransformersAdapter);
});

test('count_tokens', async t => {
  const result = await t.context.model.count_tokens(expected[0].embed_input);
  t.is(result.tokens, expected[0].tokens);
});

test('embed', async t => {
  const embedding = await t.context.model.embed(expected[0].embed_input);
  t.is(embedding.vec.length, 384);
  t.deepEqual(embedding.vec, expected[0].vec);
  t.is(embedding.tokens, expected[0].tokens);
});

test('embed_batch', async t => {
  const entity_1 = { embed_input: expected[0].embed_input };
  const entity_2 = { embed_input: expected[1].embed_input };
  const embeddings = await t.context.model.embed_batch([entity_1, entity_2]);
  t.is(embeddings.length, 2);
  t.deepEqual(embeddings[0].vec, expected[0].vec);
  t.deepEqual(embeddings[1].vec, expected[1].vec);
  t.is(embeddings[0].tokens, expected[0].tokens);
  t.is(embeddings[1].tokens, expected[1].tokens);
});
