import test from 'ava';
import { SmartEmbedModel } from '../smart_embed_model.js';
import { SmartEmbedOpenAIAdapter } from '../adapters/openai.js';

test.before(async t => {
    t.context.model = new SmartEmbedModel({
        settings: {
            model_key: 'text-embedding-ada-002',
            api_key: 'YOUR_TEST_API_KEY',
        },
        adapters: {
            openai: SmartEmbedOpenAIAdapter,
        },
    });
    await t.context.model.load();
});

test('init', t => {
    t.true(t.context.model.adapter instanceof SmartEmbedOpenAIAdapter);
});

test('count_tokens', async t => {
    const result = await t.context.model.adapter.count_tokens('Hello, world!');
    t.is(result, 4);  // Adjust if necessary
});

test('embed', async t => {
    const embedding = await t.context.model.adapter.embed('Hello, world!');
    t.is(embedding.vec.length, 1536);
});

test('embed_batch', async t => {
    const entity_1 = { embed_input: 'Hello, world!' };
    const entity_2 = { embed_input: 'Hello, universe!' };
    const embeddings = await t.context.model.adapter.embed_batch([entity_1, entity_2]);
    t.is(embeddings.length, 2);
    t.is(entity_1.vec?.length, 1536);
    t.is(entity_2.vec?.length, 1536);
});

test('api_key_validation', async t => {
    const is_valid = await t.context.model.adapter.validate_api_key();
    t.true(is_valid);
});

test('prepare_embed_input handles long inputs', async t => {
    const long_input = 'a'.repeat(100000);  // A very long input that exceeds the token limit
    const prepared_input = await t.context.model.adapter.prepare_embed_input(long_input);
    const tokens = await t.context.model.adapter.count_tokens(prepared_input);
    t.true(tokens <= t.context.model.adapter.max_tokens);
});

test('embed_batch handles long inputs', async t => {
    const long_input = 'a'.repeat(100000);
    const short_input = 'Hello, world!';
    const inputs = [
        { embed_input: long_input },
        { embed_input: short_input }
    ];
    const embeddings = await t.context.model.adapter.embed_batch(inputs);
    t.is(embeddings.length, 2);
    t.is(embeddings[0].vec.length, 1536);
    t.is(embeddings[1].vec.length, 1536);
    t.true(embeddings[0].tokens <= t.context.model.adapter.max_tokens);
    t.true(embeddings[1].tokens <= t.context.model.adapter.max_tokens);
});