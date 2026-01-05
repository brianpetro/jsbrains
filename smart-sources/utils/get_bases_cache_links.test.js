import test from 'ava';
import { get_bases_cache_links } from './get_bases_cache_links.js';

const create_source = (markdown_table) => ({
  key: 'Path/Note.md',
  env: {
    bases_caches: {
      items: {
        'Path/Note.md#table.base#view': { markdown_table },
      },
    },
  },
});

const base_outlink = { title: 'table.base', target: 'table.base#view', line: 3, embedded: true };

test('returns links from bases cache for embedded base links', t => {
  const source = create_source('Links from bases [[FromBase]] and [md](Other.md)');
  const links = get_bases_cache_links({ source, links: [base_outlink] });
  t.is(links.length, 2);
  t.like(links[0], { target: 'FromBase', line: 3 });
  t.like(links[1], { target: 'Other.md', line: 3 });
});

test('returns empty array when no embedded bases links provided', t => {
  const source = create_source('[[FromBase]]');
  const links = get_bases_cache_links({ source, links: [{ title: 'Note', target: 'Note', line: 1 }] });
  t.deepEqual(links, []);
});

test('returns empty array when cache entry is missing', t => {
  const source = create_source('');
  source.env.bases_caches.items = {};
  const links = get_bases_cache_links({ source, links: [base_outlink] });
  t.deepEqual(links, []);
});
