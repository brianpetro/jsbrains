import test from 'ava';
import { SmartSource } from '../smart_source.js';

test('V2 block interface remains backed by data.blocks', t => {
  const source = Object.create(SmartSource.prototype);
  source.data = {
    key: 'Notes/Test.md',
    blocks: {
      '#Heading': [1, 3],
    },
  };

  t.true(source.blocks_initialized);
  t.deepEqual(source.block_keys, ['#Heading']);
  t.true(source.has_block('#Heading'));
  t.deepEqual(source.get_block_lines('#Heading'), [1, 3]);

  source.replace_blocks({
    '#Next': [4, 5],
  });

  t.deepEqual(source.data.blocks, {
    '#Next': [4, 5],
  });
});
