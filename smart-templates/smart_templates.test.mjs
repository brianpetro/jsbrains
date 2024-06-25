import test from 'ava';
import { SmartTemplates } from './smart_templates.mjs';
import { SmartChatModel } from './smart-chat-model/smart_chat_model.js';

const template_pointer = './template.ejs';
const settings = {
  smart_templates: {
    var_prompts: {
      stringVar: { prompt: 'String Variable Prompt' },
      numberVar: { prompt: 'Number Variable Prompt' },
      booleanVar: { prompt: 'Boolean Variable Prompt' },
      arrayVar: { prompt: 'Array Variable Prompt' },
      objectVar: { prompt: 'Object Variable Prompt' },
      rawVar: { prompt: 'Raw Variable Prompt' },
      trimmedVar: { prompt: 'Trimmed Variable Prompt' }
    }
  }
};
const smart_templates = new SmartTemplates({ settings });

// Mock template content
const mockTemplate = `Hello, <%= stringVar %>! You have <%= numberVar %> new messages.`;

// Mock SmartChatModel
SmartChatModel.prototype.complete = async function() {
  return { stringVar: 'Alice', numberVar: 10 };
};

// Test cases

test('extract variable names and prompts from EJS template', t => {
  const variables = smart_templates.get_variables(template_pointer);
  t.deepEqual(variables, [
    { name: 'stringVar', prompt: 'String Variable Prompt' },
    { name: 'numberVar', prompt: 'Number Variable Prompt' },
    { name: 'booleanVar', prompt: 'Boolean Variable Prompt' },
    { name: 'arrayVar', prompt: 'Array Variable Prompt' },
    { name: 'objectVar', prompt: 'Object Variable Prompt' },
    { name: 'rawVar', prompt: 'Raw Variable Prompt' },
    { name: 'trimmedVar', prompt: 'Trimmed Variable Prompt' }
  ]);
});

test('get function call OpenAPI spec', t => {
  const functionCallSpec = smart_templates.get_function_call(template_pointer);
  t.truthy(functionCallSpec);
  t.is(functionCallSpec.openapi, '3.1.0');
  t.is(functionCallSpec.paths['/call-this'].post.requestBody.content['application/json'].schema.type, 'object');
  t.deepEqual(functionCallSpec.paths['/call-this'].post.requestBody.content['application/json'].schema.properties, {
    stringVar: { type: 'string', description: 'String Variable Prompt' },
    numberVar: { type: 'string', description: 'Number Variable Prompt' },
    booleanVar: { type: 'string', description: 'Boolean Variable Prompt' },
    arrayVar: { type: 'string', description: 'Array Variable Prompt' },
    objectVar: { type: 'string', description: 'Object Variable Prompt' },
    rawVar: { type: 'string', description: 'Raw Variable Prompt' },
    trimmedVar: { type: 'string', description: 'Trimmed Variable Prompt' }
  });
  t.deepEqual(functionCallSpec.paths['/call-this'].post.requestBody.content['application/json'].schema.required, [
    'stringVar',
    'numberVar',
    'booleanVar',
    'arrayVar',
    'objectVar',
    'rawVar',
    'trimmedVar'
  ]);
});

test('render template with context and options', async t => {
  const context = {
    stringVar: 'Bob',
    numberVar: 5
  };
  const opts = {
    numberVar: 10
  };
  const renderedOutput = await smart_templates.render(mockTemplate, context, opts);
  t.is(renderedOutput, 'Hello, Alice! You have 10 new messages.');
});
