import test from 'ava';
import { load_test_env } from './_env.js';

// Sample template contents
const ejsTemplatePath = 'template.st.ejs';
const markdownTemplatePath = 'template.st.md';

const ejsTemplateContent = `Hello, <%= stringVar %>! You have <%= numberVar %> new messages.`;

const markdownTemplateContent = `Hello, {{ name }}! You have {{ count }} new messages.
{{ "manually added" }}
{{"manually added 2"}}
{{ with_space }}
{{ with-hyphen }}
{{ "manually added 3" }}
{{ "manually added 4" }}
{{ "should work with inline 'apostrophes' like this" }}
{{ not_a_var }}
{{ another_not_a_var }}
{{ array_var[] }}
 `;


test.beforeEach(async t => {
  await load_test_env(t);

  // Populate the mock file system with templates
  const mockFs = t.context.env.smart_templates.fs.adapter.files;

  mockFs[ejsTemplatePath] = ejsTemplateContent;
  mockFs[markdownTemplatePath] = markdownTemplateContent;

  await t.context.env.smart_templates.init();
});

test.after.always('cleanup', t => {
  // No physical cleanup needed as we're using a mock file system
});

test.serial('Extract variables from EJS template', async t => {
  // Access the SmartTemplate instance by its file path
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const variables = await template.parse_variables();
  
  const expectedVariables = [
    { name: 'stringVar', prompt: 'String Variable Prompt', inline: false },
    { name: 'numberVar', prompt: 'Number Variable Prompt', inline: false },
  ];

  t.deepEqual(variables, expectedVariables, 'Should correctly extract variables from EJS template');
});

test.serial('Extract variables from Markdown template', async t => {
  const template = t.context.env.smart_templates.items[markdownTemplatePath];
  
  t.truthy(template, `Template not found: ${markdownTemplatePath}`);
  
  const variables = await template.parse_variables();
  
  const expectedVariables = [
    { name: 'name', prompt: 'name prompt', inline: false, type: 'string' },
    { name: 'count', prompt: 'count prompt', inline: false, type: 'string' },
    { name: 'var_1', prompt: 'manually added', inline: true, type: 'string' },
    { name: 'var_2', prompt: 'manually added 2', inline: true, type: 'string' },
    { name: 'with_space', prompt: 'with space prompt', inline: false, type: 'string' },
    { name: 'with_hyphen', prompt: 'with-hyphen prompt', inline: false, type: 'string' },
    { name: 'var_3', prompt: 'manually added 3', inline: true, type: 'string' },
    { name: 'var_4', prompt: 'manually added 4', inline: true, type: 'string' },
    { name: 'var_5', prompt: 'should work with inline \'apostrophes\' like this', inline: true, type: 'string' },
    { name: 'not_a_var', prompt: "not_a_var prompt", inline: false, type: 'string' },
    { name: 'another_not_a_var', prompt: "another_not_a_var prompt", inline: false, type: 'string' },
    { name: 'array_var', prompt: 'array_var prompt', inline: false, type: 'array' }
  ];
  
  t.deepEqual(variables, expectedVariables, 'Should correctly extract variables from Markdown template');
});

test('Complete method generates correct context', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const render_opts = {
    context: {
      stringVar: 'Alice',
      numberVar: 10
    },
    system_prompt: 'Please generate additional variables.',
    include_connections: 0
  };
  
  const completed_context = await template.complete(render_opts);
  
  const expected_context = {
    stringVar: 'Alice',
    numberVar: 10,
    var_1: 'completed 1',
    var_2: 'completed 2',
    with_space: 'completed with space',
    with_hyphen: 'completed with hyphen',
    var_3: 'completed 3',
    var_4: 'completed 4',
    var_5: 'completed with \'apostrophes\' like this',
    array_var: "[\n  \"item1\",\n  \"item2\"\n]"
    // var_6: 'manually added 6',
  };
  
  t.deepEqual(completed_context, expected_context, 'Complete method should generate the correct context');
});

test('Render method correctly renders EJS template with context', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const context = {
    stringVar: 'Alice',
    numberVar: 10,
    var_1: 'Inline Content 1',
    var_2: 'Inline Content 2',
    with_space: 'Space Content',
    with_hyphen: 'Hyphen Content',
    var_3: 'Inline Content 3',
    var_4: 'Inline Content 4',
    var_5: 'Inline Content 5'
  };
  
  const rendered = await template.render(context);
  
  const expected = `Hello, Alice! You have 10 new messages.`;
  
  t.is(rendered, expected, 'Rendered EJS template should match expected output');
});

test('Complete and Render method works correctly', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const render_opts = {
    context: {
      stringVar: 'Bob',
      numberVar: 5
    },
    system_prompt: 'Enhance the context with additional variables.',
    include_connections: 0
  };
  
  const rendered_content = await template.complete_and_render(render_opts);
  
  const expected = `Hello, Alice! You have 10 new messages.`;
  
  t.is(rendered_content, expected, 'Complete and Render method should correctly generate and render content');
});

test('Render Markdown template with context', async t => {
  const template = t.context.env.smart_templates.items[markdownTemplatePath];
  
  t.truthy(template, `Template not found: ${markdownTemplatePath}`);
  
  const context = {
    name: 'Bob',
    count: 5,
    var_1: 'Inline Content A',
    var_2: 'Inline Content B',
    with_space: 'Space Content A',
    with_hyphen: 'Hyphen Content A',
    var_3: 'Inline Content C',
    var_4: 'Inline Content D',
    var_5: "should work with inline 'apostrophes' like this",
    not_a_var: 'Should not appear',
    another_not_a_var: 'Should also not appear',
    array_var: "[\n  \"item1\",\n  \"item2\"\n]"
  };
  
  const rendered = await template.render(context);
  
  const expected = `Hello, Bob! You have 5 new messages.
Inline Content A
Inline Content B
Space Content A
Hyphen Content A
Inline Content C
Inline Content D
should work with inline 'apostrophes' like this
Should not appear
Should also not appear
[
  "item1",
  "item2"
]`;
  
  t.is(rendered, expected, 'Rendered Markdown template should match expected output');
});

test('Complete and Render Markdown template', async t => {
  const template = t.context.env.smart_templates.items[markdownTemplatePath];
  
  t.truthy(template, `Template not found: ${markdownTemplatePath}`);
  
  const render_opts = {
    context: {
      name: 'Charlie',
      count: 15
    },
    system_prompt: 'Add additional details to the context.',
    include_connections: 0
  };
  
  const rendered_content = await template.complete_and_render(render_opts);
  
  const expected = `Hello, Charlie! You have 15 new messages.
completed 1
completed 2
completed with space
completed with hyphen
completed 3
completed 4
completed with 'apostrophes' like this


[
  "item1",
  "item2"
]`;
  
  t.is(rendered_content, expected, 'Complete and Render method should correctly generate and render Markdown content');
});

test('Render template with missing variables', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const context = {
    stringVar: 'Charlie',
    // numberVar is missing
    var_1: 'Inline Content X',
    var_2: 'Inline Content Y',
    with_space: 'Space Content B',
    with_hyphen: 'Hyphen Content B',
    var_3: 'Inline Content Z',
    var_4: 'Inline Content W',
    var_5: 'Inline Content V'
  };
  
  try {
    await template.render(context);
    t.fail('Rendering should throw an error due to missing variables');
  } catch (error) {
    t.pass('Rendering threw an error due to missing variables as expected');
  }
});

test('Render template exceeding maximum content length', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const context = {
    stringVar: 'Alice'.repeat(5000),
    numberVar: 10,
  };
  
  try {
    await template.render(context);
    t.fail('Rendering should throw an error due to exceeding maximum content length');
  } catch (error) {
    t.pass('Rendering threw an error due to exceeding maximum content length as expected');
  }
});

test('Render template with different output modes', async t => {
  const template = t.context.env.smart_templates.items[ejsTemplatePath];
  
  t.truthy(template, `Template not found: ${ejsTemplatePath}`);
  
  const context = {
    stringVar: 'Diana',
    numberVar: 20,
  };
  
  // Append Blocks
  const renderedAppend = await template.render(context);
  const expectedAppend = `Hello, Diana! You have 20 new messages.`;
  t.is(renderedAppend, expectedAppend, 'Rendered content should match for append-blocks mode');
  
  // Replace Blocks
  const renderedReplace = await template.render(context);
  t.is(renderedReplace, expectedAppend, 'Rendered content should match for replace_blocks mode');
  
  // Replace All
  const renderedReplaceAll = await template.render(context);
  t.is(renderedReplaceAll, expectedAppend, 'Rendered content should match for replace-all mode');
});

