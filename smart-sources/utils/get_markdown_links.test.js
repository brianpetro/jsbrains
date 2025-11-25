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

test('standard markdown image links are marked as embedded', t => {
  const md = '![Alt text](images/picture.png)';
  const [link] = get_markdown_links(md);

  t.is(link.title, 'Alt text');
  t.is(link.target, 'images/picture.png');
  t.true(link.embedded);
});

test('embedded wiki-links are marked as embedded', t => {
  const md = '![[Some File]]';
  const [link] = get_markdown_links(md);

  t.is(link.title, 'Some File');
  t.is(link.target, 'Some File');
  t.true(link.embedded);
});

test('embedded wiki-links with alias are marked as embedded and preserve title', t => {
  const md = '![[Some File|Alias Title]]';
  const [link] = get_markdown_links(md);

  t.is(link.title, 'Alias Title');
  t.is(link.target, 'Some File');
  t.true(link.embedded);
});

test('non-embedded links are not marked as embedded', t => {
  const md = [
    '[Doc](Some%20File.md)',
    '[[Some File]]',
    'Text ! [Not embedded](file.md)'
  ].join('\n');

  const links = get_markdown_links(md);

  t.is(links.length, 3);
  links.forEach(link => {
    t.is(link.embedded, undefined);
  });
});

test('embedded detection is based on immediately preceding character only', t => {
  const md = [
    'Text! [Normal Link](file.md)',
    '!![Also Embedded](img.png)'
  ].join('\n');

  const links = get_markdown_links(md);

  t.is(links.length, 2);

  const normal = links.find(l => l.title === 'Normal Link');
  const embedded = links.find(l => l.title === 'Also Embedded');

  t.truthy(normal);
  t.truthy(embedded);

  t.is(normal.embedded, undefined);
  t.true(embedded.embedded);
});
