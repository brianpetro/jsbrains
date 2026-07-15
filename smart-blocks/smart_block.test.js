import test from 'ava';
import { BlockContentAdapter } from './adapters/_adapter.js';
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

test('block adapter requests source outlinks for the persisted line range', t => {
  let received_lines;
  const item = {
    data: { lines: [2, 4] },
    source: {
      source_adapter: {
        get_outlinks(lines) {
          received_lines = lines;
          return [{ target: 'Scoped.md', line: 3 }];
        },
      },
    },
  };
  const adapter = new BlockContentAdapter(item);

  t.deepEqual(adapter.get_outlinks(), [{ target: 'Scoped.md', line: 3 }]);
  t.deepEqual(received_lines, [2, 4]);
});

test('block adapter returns empty when block lines are missing', t => {
  const adapter = new BlockContentAdapter({ data: {} });

  t.deepEqual(adapter.get_outlinks(), []);
});

test('block outlinks delegate to the active block adapter', t => {
  const expected = [{ target: 'Delegated.md' }];
  const block = {
    block_adapter: {
      get_outlinks() {
        return expected;
      },
    },
  };
  const get_outlinks = Object.getOwnPropertyDescriptor(SmartBlock.prototype, 'outlinks').get;

  t.is(get_outlinks.call(block), expected);
});
