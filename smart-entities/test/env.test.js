import test from 'ava';
import { load_test_env } from './_env.js';
import { JsonSingleFileCollectionDataAdapter } from '../../smart-collections/adapters/json_single_file.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SmartEntity } from '../smart_entity.js';
import { SmartEntities } from '../smart_entities.js';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model/smart_embed_model.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { EntityAdapter } from '../adapters/_adapter.js';
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
  t.is(env_opts.collections.smart_entities.data_adapter, JsonSingleFileCollectionDataAdapter);
  t.is(env_opts.collections.smart_entities, SmartEntities);
  t.is(env_opts.item_types.SmartEntity, SmartEntity);
});

test('TestMain is initialized correctly', t => {
  t.truthy(t.context.env.main);
  t.is(t.context.env.main.constructor.name, 'TestMain');
  t.deepEqual(t.context.env.main.settings, {});
});

test('smart_entities are loaded with data from _data.json', async t => {
  const data_path = join(__dirname, '_data.json');
  const test_data = JSON.parse(fs.readFileSync(data_path, 'utf8'));
  const smart_entities = t.context.env.smart_entities;

  t.is(Object.keys(smart_entities.items).length, Object.keys(test_data).length);

  for (const [key, entity_data] of Object.entries(test_data)) {
    if (key.startsWith('SmartEntity:')) {
      const entity = smart_entities.get(entity_data.path);
      t.truthy(entity, `Entity not found: ${entity_data.path}`);
      t.is(entity.data.path, entity_data.path);
      t.deepEqual(entity.data.embeddings, entity_data.embeddings);
    }
  }
});

test('load_test_env does not throw errors', t => {
  t.notThrows(() => load_test_env(t));
});

test('SmartEntity adapter is initialized correctly', t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get(Object.keys(smart_entities.items)[0]);
  t.truthy(entity.entity_adapter);
  t.true(entity.entity_adapter instanceof EntityAdapter);
});

test('SmartEntity methods work correctly', async t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get(Object.keys(smart_entities.items)[0]);

  t.truthy(entity.nearest);
  t.truthy(entity.get_as_context);
  t.truthy(entity.find_connections);

  const connections = entity.find_connections();
  t.true(Array.isArray(connections));
});

test('SmartEntity getters work correctly', t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get(Object.keys(smart_entities.items)[0]);

  t.truthy(entity.embed_link);
  t.truthy(entity.name);
  t.truthy(entity.embed_model_key);
  t.truthy(entity.is_unembedded);
});

test('SmartEntity vec getter and setter work correctly', t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get('test1');

  t.deepEqual(entity.vec, [0.1, 0.2, 0.3], 'Initial vec value is correct');

  const new_vec = [0.9, 0.8, 0.7];
  entity.vec = new_vec;
  t.deepEqual(entity.vec, new_vec, 'Vec value is updated correctly');
});

test('SmartEntity handles multiple embedding models', t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get('test3');

  t.deepEqual(entity.data.embeddings.model1.vec, [0.7, 0.8, 0.9], 'Vec for model1 is correct');
  t.deepEqual(entity.data.embeddings.model2.vec, [0.11, 0.12, 0.13], 'Vec for model2 is correct');
});

test('SmartEntity handles unembedded entities', t => {
  const smart_entities = t.context.env.smart_entities;
  const entity = smart_entities.get('test4');

  t.deepEqual(entity.data.embeddings, {}, 'Unembedded entity has empty embeddings');
  t.is(entity.vec, undefined, 'Unembedded entity has undefined vec');
  t.true(entity.is_unembedded, 'Unembedded entity is correctly identified');
});