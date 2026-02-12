import test from 'ava';
import { SmartBlock } from './smart_block.js';

test('SmartBlock.filter uses source metadata for frontmatter include/exclude', (t) => {
  const block = {
    key: 'notes/demo.md#h1',
    source: { metadata: { type: 'Feature', labels: ['Core', 'Docs'] } },
  };

  t.true(SmartBlock.prototype.filter.call(block, {
    key_includes: '#h1',
    frontmatter: {
      include: [{ key: 'type', value: 'feature' }],
      exclude: [{ key: 'type', value: 'draft' }],
    },
  }));

  t.true(SmartBlock.prototype.filter.call(block, {
    frontmatter: {
      include: [{ key: 'labels', value: 'docs' }],
    },
  }));

  t.false(SmartBlock.prototype.filter.call(block, {
    frontmatter: {
      include: [{ key: 'labels', value: 'missing' }],
    },
  }));
});
