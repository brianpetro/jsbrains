import test from 'ava';
import {
  get_links_to_depth,
} from '../actions/get_links_to_depth.js';

test('get_links_to_depth uses transient outlinks without mutating cached sources', (t) => {
  const deeper_source = {
    key: 'Deeper.md',
    path: 'Deeper.md',
    outlinks: [],
  };
  const contextual_source = {
    key: 'Contextual.md',
    path: 'Contextual.md',
    outlinks: [
      {
        key: deeper_source.key,
      },
    ],
  };
  const canonical_row = {
    key: 'Canonical row.md',
    path: 'Canonical row.md',
    outlinks: [],
  };
  const bases_source = {
    key: 'Tasks.base',
    path: 'Tasks.base',
    outlinks: [
      {
        key: canonical_row.key,
      },
    ],
  };
  const root_source = {
    key: 'Overview.md',
    path: 'Overview.md',
    outlinks: [
      {
        key: bases_source.key,
        embedded: true,
      },
    ],
  };
  const sources = {
    [bases_source.key]: bases_source,
    [canonical_row.key]: canonical_row,
    [contextual_source.key]: contextual_source,
    [deeper_source.key]: deeper_source,
    [root_source.key]: root_source,
  };
  const collection = {
    links: {},
    get(key) {
      return sources[key];
    },
  };
  Object.values(sources).forEach(source => {
    source.collection = collection;
  });

  const root_outlinks = root_source.outlinks;
  const bases_outlinks = bases_source.outlinks;
  const graph = get_links_to_depth(root_source, 2, {
    include_self: true,
    outlinks_by_source: {
      [root_source.key]: [
        ...root_source.outlinks,
        {
          key: contextual_source.key,
          bases_row: 0,
        },
      ],
      [bases_source.key]: [],
    },
  });

  t.deepEqual(
    graph.map(entry => [entry.item.key, entry.depth]),
    [
      [root_source.key, 0],
      [bases_source.key, 1],
      [contextual_source.key, 1],
      [deeper_source.key, 2],
    ],
  );
  t.false(graph.some(entry => entry.item.key === canonical_row.key));
  t.is(root_source.outlinks, root_outlinks);
  t.is(bases_source.outlinks, bases_outlinks);
});
