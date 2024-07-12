import { MarkdownAdapter } from './markdown.js';
import test from 'ava';
import { SmartTemplates } from '../smart_templates.js';
import fs from 'node:fs';

const settings = {
  smart_templates: {
    var_prompts: {
      name: { prompt: 'name prompt' },
      count: { prompt: 'count prompt' },
      with_space: { prompt: 'with space prompt' },
      with_hyphen: { prompt: 'with hyphen prompt' },
    }
  }
};
const markdown_template_path = './adapters/markdown.test.md';
const ejs_template_path = './adapters/markdown.test.ejs';

const markdown_template = fs.readFileSync(markdown_template_path, 'utf8');
const ejs_template = fs.readFileSync(ejs_template_path, 'utf8');

test('convert_to_ejs replaces mustache syntax with EJS syntax', async t => {
  const markdownAdapter = new MarkdownAdapter();
  const ejsTemplate = await markdownAdapter.convert_to_ejs(markdown_template);
  t.is(ejsTemplate, ejs_template);
});
test('extract variable names and prompts from EJS template', async t => {
  const smart_templates = new SmartTemplates({ settings }, { file_type_adapters: [MarkdownAdapter] });
  const variables = await smart_templates.get_variables('./adapters/markdown.test.md');
  t.deepEqual(variables, [
    { name: 'name', prompt: 'name prompt' },
    { name: 'count', prompt: 'count prompt' },
    { name: 'var_1', prompt: 'manually added' },
    { name: 'var_2', prompt: 'manually added 2' },
    { name: 'with_space', prompt: 'with space prompt' },
    { name: 'with_hyphen', prompt: 'with hyphen prompt' },
  ]);
});
test('should handle templates with no variables', async t => {
  const smart_templates = new MarkdownAdapter();
  const variables = await smart_templates.get_variables('\n\n\n');
  t.deepEqual(variables, []);
});