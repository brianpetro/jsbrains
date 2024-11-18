import test from 'ava';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedOpenAIAdapter } from '../adapters/openai.js';
import expected from './openai.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Mock the API calls in SmartEmbedOpenAIAdapter
class MockSmartEmbedOpenAIAdapter extends SmartEmbedOpenAIAdapter {
//   async embed(input) {
//     // Mock embedding vector
//     return { vec: Array(this.dims).fill(0.1), tokens: (await this.count_tokens(input)).tokens };
//   }

//   async embed_batch(inputs) {
//     // Mock batch embedding
//     return inputs.map(input => ({
//       vec: Array(this.dims).fill(0.1),
//       tokens: input.embed_input.split(' ').length
//     }));
//   }

//   async validate_api_key() {
//     // Mock API key validation
//     return true;
//   }
}

test.beforeEach(async t => {
  const model = new SmartEmbedModel({
    model_key: 'text-embedding-ada-002',
    settings: {
    //   api_key: 'DUMMY_API_KEY',
      api_key: OPENAI_API_KEY,
    },
    adapters: {
      openai: MockSmartEmbedOpenAIAdapter,
    },
  });
  await model.initialize();
  t.context.model = model;
});

test('init', t => {
  t.true(t.context.model.adapter instanceof MockSmartEmbedOpenAIAdapter);
});

test('count_tokens', async t => {
  const result = await t.context.model.count_tokens(expected[0].embed_input);
  t.is(result.tokens, expected[0].tokens);
});

test('embed', async t => {
  const embedding = await t.context.model.embed(expected[0].embed_input);
  t.is(embedding.vec.length, 1536);
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

test('api_key_validation', async t => {
  const is_valid = await t.context.model.adapter.validate_api_key();
  t.true(is_valid);
});