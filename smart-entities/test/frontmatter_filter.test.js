import test from 'ava';
import {
  filter_by_frontmatter,
  parse_frontmatter_filter_lines,
} from '../utils/frontmatter_filter.js';

test('parse_frontmatter_filter_lines supports key and key:value entries', (t) => {
  const parsed = parse_frontmatter_filter_lines('status\nType:Feature\n  Team : Platform  ');

  t.deepEqual(parsed, [
    { key: 'status', value: null },
    { key: 'type', value: 'feature' },
    { key: 'team', value: 'platform' },
  ]);
});

test('filter_by_frontmatter matches keys and values case-insensitively', (t) => {
  const frontmatter_filter = {
    include: parse_frontmatter_filter_lines('status:open\ncategory'),
  };

  t.true(filter_by_frontmatter({ Status: 'OPEN' }, frontmatter_filter));
  t.true(filter_by_frontmatter({ CATEGORY: 'notes' }, frontmatter_filter));
  t.false(filter_by_frontmatter({ type: 'feature' }, frontmatter_filter));
});

test('filter_by_frontmatter matches list values', (t) => {
  const frontmatter_filter = {
    include: parse_frontmatter_filter_lines('tags:alpha'),
  };

  t.true(filter_by_frontmatter({ tags: ['beta', 'ALPHA'] }, frontmatter_filter));
  t.false(filter_by_frontmatter({ tags: ['beta'] }, frontmatter_filter));
});

test('filter_by_frontmatter applies excludes before includes', (t) => {
  const frontmatter_filter = {
    include: parse_frontmatter_filter_lines('status:open'),
    exclude: parse_frontmatter_filter_lines('status:open\npriority:low'),
  };

  t.false(filter_by_frontmatter({ status: 'open' }, frontmatter_filter));
  t.false(filter_by_frontmatter({ status: 'OPEN', priority: 'low' }, frontmatter_filter));
});

test('filter_by_frontmatter includes by default when include list empty', (t) => {
  const frontmatter_filter = {
    exclude: parse_frontmatter_filter_lines('status:closed'),
  };

  t.true(filter_by_frontmatter({}, frontmatter_filter));
  t.true(filter_by_frontmatter({ status: 'open' }, frontmatter_filter));
  t.false(filter_by_frontmatter({ status: 'closed' }, frontmatter_filter));
});
