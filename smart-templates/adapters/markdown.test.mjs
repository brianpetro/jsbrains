import { MarkdownAdapter } from './markdown.mjs';
import test from 'ava';

test('convert_to_ejs replaces mustache syntax with EJS syntax', async t => {
  const markdownAdapter = new MarkdownAdapter();
  const mustacheTemplate = 'Hello, {{ name }}! You have {{ count }} new messages.';
  const ejsTemplate = await markdownAdapter.convert_to_ejs(mustacheTemplate);
  t.is(ejsTemplate, 'Hello, <%- name %>! You have <%- count %> new messages.');
});
