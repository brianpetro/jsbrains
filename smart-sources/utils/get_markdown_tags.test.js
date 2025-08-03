import test from 'ava';
import { get_markdown_tags } from './get_markdown_tags.js';

test('extracts unique tags from markdown content', t => {
  const content = '#tag1 some text #tag2 #tag1';
  const tags = get_markdown_tags(content);
  t.deepEqual(tags.sort(), ['#tag1', '#tag2']);
});

test('handles slashes and dashes in tags', t => {
  const content = '#parent/child text #multi-word';
  const tags = get_markdown_tags(content);
  t.deepEqual(tags.sort(), ['#multi-word', '#parent/child']);
});
