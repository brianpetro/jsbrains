import test from 'ava';
import { SmartEnv } from '../smart_env.js';
import { Collection } from 'smart-collections/collection.js';

class TempCollection extends Collection {}

test('to_json serializes collection item data', t => {
  const env = new SmartEnv();
  SmartEnv.global_env = env;
  const col = new TempCollection(env, { collection_key: 'temp_collection' });
  col.items = { first: { data: { foo: 'bar' } } };
  const json = env.to_json();
  t.deepEqual(json, { temp_collection: { items: { first: { foo: 'bar' } } } });
});

test('export_json returns stringified environment JSON', t => {
  const env = new SmartEnv();
  SmartEnv.global_env = env;
  const col = new TempCollection(env, { collection_key: 'temp_collection' });
  col.items = { one: { data: { hello: 'world' } } };
  const json_str = env.export_json('env.json');
  t.is(json_str, JSON.stringify({ temp_collection: { items: { one: { hello: 'world' } } } }, null, 2));
});
