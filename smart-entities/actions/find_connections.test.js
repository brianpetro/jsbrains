import test from 'ava';
import { create_find_connections_filter_opts } from './find_connections.js';

const create_entity = (overrides = {}) => {
  const {
    smart_view_filter = {},
    env: override_env,
    ...rest
  } = overrides;
  const env = override_env || {
    settings: {
      smart_view_filter: { ...smart_view_filter },
    },
  };
  if (!env.settings) env.settings = {};
  if (!env.settings.smart_view_filter) env.settings.smart_view_filter = { ...smart_view_filter };
  return {
    key: 'entity-key',
    source_key: 'source-key',
    inlinks: ['inlink-1'],
    outlinks: ['outlink-1'],
    env,
    ...rest,
  };
};

test('create_find_connections_filter_opts removes limit properties', (t) => {
  const entity = create_entity();
  const params = { limit: 5, filter: { limit: 3, foo: 'bar' } };
  const result = create_find_connections_filter_opts(entity, params);

  t.false('limit' in result);
  t.true('filter' in result);
  t.false('limit' in result.filter);
  t.is(result.filter.foo, 'bar');
});

test('create_find_connections_filter_opts appends frontmatter suffix without mutating settings', (t) => {
  const entity = create_entity({ smart_view_filter: { exclude_key_ends_with_any: ['.md'] } });
  const params = { exclude_frontmatter_blocks: true };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.exclude_key_ends_with_any, ['.md', '---frontmatter---']);
  t.deepEqual(entity.env.settings.smart_view_filter.exclude_key_ends_with_any, ['.md']);
});

test('create_find_connections_filter_opts normalizes prefix exclusions and appends entity key', (t) => {
  const entity = create_entity({ source_key: 'source-prefix' });
  const params = { exclude_key_starts_with: 'user-prefix' };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.exclude_key_starts_with_any, ['user-prefix', 'source-prefix']);
  t.false('exclude_key_starts_with' in result);
});

test('create_find_connections_filter_opts expands exclude_filter into exclude_key_includes_any', (t) => {
  const entity = create_entity({ smart_view_filter: { exclude_key_includes_any: ['existing'] } });
  const params = { exclude_filter: 'foo,bar' };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.exclude_key_includes_any, ['existing', 'foo', 'bar']);
});

test('create_find_connections_filter_opts expands include_filter into key_includes_any', (t) => {
  const entity = create_entity({ smart_view_filter: { key_includes_any: ['alpha'] } });
  const params = { include_filter: 'beta' };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.key_includes_any, ['alpha', 'beta']);
});

test('create_find_connections_filter_opts trims whitespace around filter fragments', (t) => {
  const entity = create_entity();
  const params = { include_filter: '  alpha , beta  ', exclude_filter: '  skip , done  ' };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.key_includes_any, ['alpha', 'beta']);
  t.deepEqual(result.exclude_key_includes_any, ['skip', 'done']);
});

test('create_find_connections_filter_opts appends inlinks and outlinks when excluded', (t) => {
  const entity = create_entity({
    source_key: 'source-prefix',
    inlinks: ['in-1', 'in-2'],
    outlinks: ['out-1'],
  });
  const params = { exclude_inlinks: true, exclude_outlinks: true };
  const result = create_find_connections_filter_opts(entity, params);

  t.deepEqual(result.exclude_key_starts_with_any, ['source-prefix', 'in-1', 'in-2', 'out-1']);
});
