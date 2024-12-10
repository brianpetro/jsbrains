import test from 'ava';
import { load_test_env } from './_env.js';
import { JsonSingleFileCollectionDataAdapter } from '../../smart-collections/adapters/json_single_file.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SmartSource } from '../smart_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartBlock } from '../smart_block.js';
import { SmartBlocks } from '../smart_blocks.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.beforeEach(async t => {
    await load_test_env(t);
});

test('load_test_env initializes the environment correctly', t => {
    t.truthy(t.context.env);
    t.true(t.context.env instanceof SmartEnv);
    t.truthy(t.context.env.main);
    t.deepEqual(t.context.env.main.settings, {});
});

test('SmartEnv is initialized with correct options', t => {
    const env_opts = t.context.env.main.smart_env_config;
    t.is(env_opts.env_data_dir, 'test');
    t.is(env_opts.modules.smart_embed_model, SmartEmbedModel);
    t.is(env_opts.modules.smart_fs.class, SmartFs);
    t.is(env_opts.modules.smart_fs.adapter, SmartFsTestAdapter);
    t.is(env_opts.collections.smart_sources, SmartSources);
    t.is(env_opts.collections.smart_sources.adapter_class, JsonSingleFileCollectionDataAdapter);
    t.is(env_opts.collections.smart_blocks, SmartBlocks);
    t.is(env_opts.item_types.SmartSource, SmartSource);
    t.is(env_opts.item_types.SmartBlock, SmartBlock);
});

test('TestMain is initialized correctly', t => {
    t.truthy(t.context.env.main);
    t.is(t.context.env.main.constructor.name, 'TestMain');
    t.deepEqual(t.context.env.main.settings, {});
});

test('smart_sources are loaded with data from _data.json', async t => {
    const data_path = join(__dirname, '_data.json');
    const test_data = JSON.parse(fs.readFileSync(data_path, 'utf8'));
    const smart_sources = t.context.env.smart_sources;

    t.is(
        Object.keys(smart_sources.items).length, 
        Object.keys(test_data).filter(key => key.startsWith('SmartSource:')).length
    );

    // console.log("smart_sources.items", smart_sources.items);
    // console.log("smart_sources.adapter.test_data", smart_sources.adapter.test_data);
    // console.log("smart_sources.fs.test_data", smart_sources.fs.adapter.files);

    for (const [key, source_data] of Object.entries(test_data)) {
        if (key.startsWith('SmartSource:')) {
            const source = smart_sources.get(source_data.path);
            t.truthy(source, `Source not found: ${source_data.path}`);
            t.is(source.data.path, source_data.path);
            t.is(await source.read(), source_data.content);
        }
    }
});

test('load_test_env does not throw errors', t => {
    t.notThrows(() => load_test_env(t));
});