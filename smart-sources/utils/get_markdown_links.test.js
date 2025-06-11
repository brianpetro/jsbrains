import test from 'ava';
import { get_markdown_links } from './get_markdown_links.js';

test('decodes URL‑escaped spaces in local markdown links', t => {
  const md = '[Doc](Some%20File.md)';
  const [link] = get_markdown_links(md);
  t.is(link.target, 'Some File.md');
});

test('wiki‑links are returned unchanged', t => {
  const md = '[[Some File]]';
  const [link] = get_markdown_links(md);
  t.is(link.target, 'Some File');
});

test('external URLs are *not* decoded', t => {
  const md = '[ext](https://example.com/query%20param)';
  const [link] = get_markdown_links(md);
  t.is(link.target, 'https://example.com/query%20param');
});
