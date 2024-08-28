import test from 'ava';
import { load_test_env } from './_env.js';
import { SmartEmbedOpenAIAdapter } from '../adapters/openai.js';

test.before(async t => {
    await load_test_env(t);
});

test('init', t => {
    t.true(t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter instanceof SmartEmbedOpenAIAdapter);
});

test('count_tokens', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    const result = await adapter.count_tokens('Hello, world!');
    t.is(result, 4);  // OpenAI tokenizer might count differently
});

test('embed', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    const embedding = await adapter.embed('Hello, world!');
    t.is(embedding.vec.length, 1536);
});

test('embed_batch', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    adapter.smart_embed.opts.batch_size = 2;
    const entity_1 = { embed_input: 'Hello, world!' };
    const entity_2 = { embed_input: 'Hello, universe!' };
    const embeddings = await adapter.embed_batch([entity_1, entity_2]);
    t.is(embeddings.length, 2);
    t.is(entity_1.vec?.length, 1536);
    t.is(entity_2.vec?.length, 1536);
});

test('api_key_validation', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    const is_valid = await adapter.validate_api_key();
    t.true(is_valid);
});

test('prepare_embed_input handles long inputs', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    const long_input = 'a'.repeat(100000);  // A very long input that exceeds the token limit
    const prepared_input = await adapter.prepare_embed_input(long_input);
    const tokens = await adapter.count_tokens(prepared_input);
    t.true(tokens <= adapter.max_tokens);
});

test('embed_batch handles long inputs', async t => {
    const adapter = t.context.env.smart_embed_active_models['text-embedding-ada-002'].adapter;
    const long_input = 'a'.repeat(100000);
    const short_input = 'Hello, world!';
    const inputs = [
        { embed_input: long_input },
        { embed_input: short_input }
    ];
    const embeddings = await adapter.embed_batch(inputs);
    t.is(embeddings.length, 2);
    t.is(embeddings[0].vec.length, 1536);
    t.is(embeddings[1].vec.length, 1536);
    t.true(embeddings[0].tokens <= adapter.max_tokens);
    t.true(embeddings[1].tokens <= adapter.max_tokens);
});