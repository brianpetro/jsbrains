import test from 'ava';
import { collection_instance_name_from } from './collection_instance_name_from.js';
// test CollectionItem -> collection
test('CollectionItem -> collection', t => {
  t.is(collection_instance_name_from('CollectionItem'), 'collection');
});

// test SmartSource -> smart_sources
test('SmartSource -> smart_sources', t => {
  t.is(collection_instance_name_from('SmartSource'), 'smart_sources');
});

// test SmartEntity -> smart_entities
test('SmartEntity -> smart_entities', t => {
  t.is(collection_instance_name_from('SmartEntity'), 'smart_entities');
});