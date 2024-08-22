import test from 'ava';
import { load_test_env } from './_env.js';
import test_data from './_data.json' assert { type: "json" };

test.beforeEach(async t => { 
  await load_test_env(t);
});

test.serial('SmartEntities initialization', async t => {
  const { env } = t.context;
  t.truthy(env.smart_entities.smart_embed, 'SmartEmbed should be initialized');
});

test.serial('SmartEntities create_or_update', async t => {
  const { env } = t.context;
  const entity_data = test_data['SmartEntity:test1'];
  const entity = await env.smart_entities.create_or_update(entity_data);
  t.is(entity.path, 'test1', 'Entity path should match');
  t.deepEqual(entity.vec, [0.1, 0.2, 0.3], 'Entity vector should match');
});

test.serial('SmartEntities nearest', async t => {
  const { env } = t.context;
  await Promise.all(Object.values(test_data).map(entity_data => env.smart_entities.create_or_update(entity_data)));
  
  const nearest = env.smart_entities.nearest([0.1, 0.2, 0.3]);
  t.is(nearest.length, 3, 'Should return all entities');
  t.is(nearest[0].path, 'test1', 'Nearest entity should be entity1');
});

test.serial('SmartEntities lookup', async t => {
  const { env } = t.context;
  await Promise.all(Object.values(test_data).map(entity_data => env.smart_entities.create_or_update(entity_data)));
  
  const result = await env.smart_entities.lookup({ hypotheticals: ['test query'] });
  t.is(result.length, 3, 'Should return all entities');
});

test.serial('SmartEntity find_connections', async t => {
  const { env } = t.context;
  await Promise.all(Object.values(test_data).map(entity_data => env.smart_entities.create_or_update(entity_data)));
  
  const entity = env.smart_entities.get('test1');
  const connections = entity.find_connections();
  t.is(connections.length, 2, 'Should return 2 connections');
  t.is(connections[0].path, 'test2', 'First connection should be entity2');
});

test.serial('SmartEntity vec getter and setter via EntityAdapter', async t => {
  const { env } = t.context;
  const entity_data = test_data['SmartEntity:test1'];
  const entity = await env.smart_entities.create_or_update(entity_data);

  t.deepEqual(entity.vec, [0.1, 0.2, 0.3], 'Entity vector should match initial data');

  const new_vec = [0.4, 0.5, 0.6];
  entity.vec = new_vec;
  t.deepEqual(entity.vec, new_vec, 'Entity vector should be updated');
  t.deepEqual(entity.data.embeddings[entity.embed_model].vec, new_vec, 'Entity data should be updated');
});