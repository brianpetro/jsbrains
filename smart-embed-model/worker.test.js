const test = require('ava');
const { Worker } = require('worker_threads');
const path = require('path');

async function initialize_worker(t) {
    t.context.worker = new Worker(path.resolve(__dirname, './worker.js'));
    await new Promise(resolve => t.context.worker.once('online', resolve));
}

async function terminate_worker(t) {
    await t.context.worker.terminate();
}

async function post_message_and_wait_for_response(worker, message) {
    return new Promise(resolve => {
        worker.once('message', resolve);
        worker.postMessage(message);
    });
}

test.beforeEach(async t => {
    await initialize_worker(t);
});

test.afterEach(async t => {
    await terminate_worker(t);
});

test('should initialize model', async t => {
    const message = await post_message_and_wait_for_response(t.context.worker, {
        type: 'init',
        env: 'test',
        model_config: { model_key: 'TaylorAI/bge-micro-v2' }
    });

    t.is(message.type, 'model_loaded');
    t.is(message.data, true);
});

test('should handle embed', async t => {
    // Initialize model
    await post_message_and_wait_for_response(t.context.worker, {
        type: 'init',
        env: 'test',
        model_config: { model_key: 'TaylorAI/bge-micro-v2' }
    });

    // Handle embed
    const message = await post_message_and_wait_for_response(t.context.worker, {
        type: 'embed',
        embed_input: 'test input',
        handler_id: 'test_handler'
    });

    t.is(message.type, 'embed_resp');
    t.is(message.handler_id, 'test_handler');
    t.truthy(message.data);
});

test('should handle embed batch', async t => {
    // Initialize model
    await post_message_and_wait_for_response(t.context.worker, {
        type: 'init',
        env: 'test',
        model_config: { model_key: 'TaylorAI/bge-micro-v2' }
    });

    // Handle embed batch
    const message = await post_message_and_wait_for_response(t.context.worker, {
        type: 'embed_batch',
        embed_input: [{embed_input: 'test input 1'}, {embed_input: 'test input 2'}],
        handler_id: 'test_handler'
    });
    console.log({message});

    t.is(message.type, 'embed_batch_resp');
    t.is(message.handler_id, 'test_handler');
    t.truthy(message?.data);
});

test('should handle token count', async t => {
    // Initialize model
    await post_message_and_wait_for_response(t.context.worker, {
        type: 'init',
        env: 'test',
        model_config: { model_key: 'TaylorAI/bge-micro-v2' }
    });

    // Handle token count
    const message = await post_message_and_wait_for_response(t.context.worker, {
        type: 'token_count',
        embed_input: 'test input',
        handler_id: 'test_handler'
    });

    t.is(message.type, 'token_count_resp');
    t.is(message.handler_id, 'test_handler');
    t.is(typeof message.count, 'number');
});
