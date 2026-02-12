import test from 'ava';
import { SmartSource } from '../smart_source.js';

test('SmartSource.filter applies frontmatter include/exclude after base filter', (t) => {
  const source = {
    key: 'notes/demo.md',
    metadata: { status: 'open', tags: ['alpha'] },
  };

  t.true(SmartSource.prototype.filter.call(source, {
    key_includes: 'demo',
    frontmatter: {
      include: [{ key: 'status', value: 'open' }],
      exclude: [{ key: 'status', value: 'closed' }],
    },
  }));

  t.false(SmartSource.prototype.filter.call(source, {
    key_includes: 'demo',
    frontmatter: {
      include: [{ key: 'status', value: 'open' }],
      exclude: [{ key: 'status', value: 'open' }],
    },
  }));

  t.false(SmartSource.prototype.filter.call(source, {
    key_includes: 'missing',
    frontmatter: {
      include: [{ key: 'status', value: 'open' }],
    },
  }));
});
