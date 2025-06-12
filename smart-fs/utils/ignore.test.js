import test from 'ava';
import { SmartFs } from '../smart_fs.js';
import { SmartFsTestAdapter } from '../adapters/_test.js';
import { load_ignore_patterns_smart, should_ignore, is_text_file } from './ignore.js';

test('should_ignore() returns true if path matches any pattern', t => {
  // Note the raw patterns – 'foo', 'bar', '*.log' – are deliberately unexpanded
  // to confirm that should_ignore() expands them.
  const patterns = ['foo', 'foo/**', 'bar', '*.log'];

  // direct match
  t.true(should_ignore('foo', patterns));
  // subfolder under "foo"
  t.true(should_ignore('foo/sub/path.md', patterns));
  // partial match for bar
  t.true(should_ignore('bar', patterns));
  // extension match
  t.true(should_ignore('notes/error.log', patterns));
  // not matched
  t.false(should_ignore('some_file.md', patterns));
  t.false(should_ignore('foo-bar', patterns));
});

test('load_ignore_patterns_smart should detect .gitignore and .scignore upward', async t => {
  const env = {};
  const smart_fs = new SmartFs(env, { adapter: SmartFsTestAdapter });

  // Setup in-memory structure
  await smart_fs.adapter.mkdir('.');
  await smart_fs.adapter.write('.gitignore', '# comment\nfoo\nbar/\n*.log');
  await smart_fs.adapter.mkdir('subfolder');
  await smart_fs.adapter.write('subfolder/.scignore', '# scignore comment\nbaz\n*.tmp');
  // In an even deeper folder
  await smart_fs.adapter.mkdir('subfolder/deeper');

  // Include parents = true so we actually load from '.' and 'subfolder'
  const patterns = await load_ignore_patterns_smart(smart_fs, 'subfolder/deeper', true);

  // .gitignore => [ "**/foo", "**/foo/**", "**/bar", "**/bar/**", "**/*.log" ]
  // .scignore => [ "**/baz", "**/baz/**", "**/*.tmp" ]

  t.truthy(patterns.includes('**/foo'));
  t.truthy(patterns.includes('**/foo/**'));
  t.truthy(patterns.includes('**/bar'));
  t.truthy(patterns.includes('**/bar/**'));
  t.truthy(patterns.includes('**/*.log'));
  t.truthy(patterns.includes('**/baz'));
  t.truthy(patterns.includes('**/baz/**'));
  t.truthy(patterns.includes('**/*.tmp'));
});

test('is_text_file() returns true for no extension known text files', t => {
  t.true(is_text_file('Dockerfile'));
  t.true(is_text_file('Appfile'));
  t.true(is_text_file('Matchfile'));
  t.true(is_text_file('Deliverfile'));
  t.true(is_text_file('Gymfile'));
});

test('should match absolute paths', t => {
  const patterns = ['**/community-actions/README.md'];
  t.true(should_ignore("C:/Users/brian/Documents/community-actions/README.md", patterns));
});