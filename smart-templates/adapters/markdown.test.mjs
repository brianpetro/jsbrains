import { MarkdownAdapter } from './markdown.mjs';
import test from 'ava';
import { SmartTemplates } from '../smart_templates.js';

const settings = {
  smart_templates: {
    var_prompts: {
      name: { prompt: 'name prompt' },
      count: { prompt: 'count prompt' },
    }
  }
};
const markdown_template = 'Hello, {{ name }}! You have {{ count }} new messages.\n{{ "manually added" }}\n{{ "manually added 2" }}';
test('convert_to_ejs replaces mustache syntax with EJS syntax', async t => {
  const markdownAdapter = new MarkdownAdapter();
  const ejsTemplate = await markdownAdapter.convert_to_ejs(markdown_template);
  t.is(ejsTemplate, 'Hello, <%- name %>! You have <%- count %> new messages.\n<%- var_1 %>\n<%- var_2 %>');
});
test('extract variable names and prompts from EJS template', async t => {
  const smart_templates = new SmartTemplates({ settings }, { file_type_adapters: [MarkdownAdapter] });
  const variables = await smart_templates.get_variables('./adapters/markdown.test.md');
  t.deepEqual(variables, [
    { name: 'name', prompt: 'name prompt' },
    { name: 'count', prompt: 'count prompt' },
    { name: 'var_1', prompt: 'manually added' },
    { name: 'var_2', prompt: 'manually added 2' },
  ]);
});