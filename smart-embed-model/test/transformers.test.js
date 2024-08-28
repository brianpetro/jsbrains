import test from 'ava';
import { load_test_env } from './_env.js';
import { SmartEmbedTransformersAdapter } from '../adapters/transformers.js';

test.before(async t => {
  await load_test_env(t);
});

test('init', t => {
  t.true(t.context.env.smart_embed_active_models['TaylorAI/bge-micro-v2'].adapter instanceof SmartEmbedTransformersAdapter);
});

test('count_tokens', async t => {
  const adapter = t.context.env.smart_embed_active_models['TaylorAI/bge-micro-v2'].adapter;
  const result = await adapter.count_tokens('Hello, world!');
  t.is(result.tokens, 6);
});

test('embed', async t => {
  const adapter = t.context.env.smart_embed_active_models['TaylorAI/bge-micro-v2'].adapter;
  const embedding = await adapter.embed('Hello, world!');
  t.is(embedding.vec.length, 384);
});

test('embed_batch', async t => {
  const adapter = t.context.env.smart_embed_active_models['TaylorAI/bge-micro-v2'].adapter;
  adapter.smart_embed.opts.batch_size = 2;
  const entity_1 = { embed_input: 'Hello, world!' };
  const entity_2 = { embed_input: 'Hello, universe!' };
  const embeddings = await adapter.embed_batch([entity_1, entity_2]);
  t.is(embeddings.length, 2);
  t.is(entity_1.vec?.length, 384);
  t.is(entity_2.vec?.length, 384);
});