import test from 'ava';
import { SmartBlock } from './smart_block.js';

test('read forwards params to the block adapter', async t => {
  const params = { this_file: 'Notes/Current.md' };
  let received_params;
  const block = {
    block_adapter: {
      async read(next_params) {
        received_params = next_params;
        return 'content';
      },
    },
  };

  const content = await SmartBlock.prototype.read.call(block, params);

  t.is(content, 'content');
  t.is(received_params, params);
});

test('outlinks resolves only links in the block line range', t => {
  const get_outlinks = Object.getOwnPropertyDescriptor(SmartBlock.prototype, 'outlinks').get;
  let received_lines;
  const block = {
    data: { lines: [2, 4] },
    has_lines: true,
    source: {
      get_outlinks(lines) {
        received_lines = lines;
        return [{ target: 'Scoped.md', line: 3 }];
      },
    },
  };

  t.deepEqual(get_outlinks.call(block), [{ target: 'Scoped.md', line: 3 }]);
  t.deepEqual(received_lines, [2, 4]);
});

test('outlinks returns empty when block lines are missing', t => {
  const get_outlinks = Object.getOwnPropertyDescriptor(SmartBlock.prototype, 'outlinks').get;
  const block = {
    data: {},
    has_lines: false,
  };

  t.deepEqual(get_outlinks.call(block), []);
});
