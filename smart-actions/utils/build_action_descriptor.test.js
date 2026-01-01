import test from 'ava';
import { build_action_descriptor } from './build_action_descriptor.js';

const base_schema = {
  type: 'object',
  properties: { query: { type: 'string' } },
  required: ['query'],
};

test('build_action_descriptor creates tool from schema', t => {
  const descriptor = build_action_descriptor({
    module: {
      description: 'Search contexts',
      instruction: 'Find matches',
      input_schema: base_schema,
      output_schema: { type: 'array' },
      settings_config: { limit: { type: 'number' } },
    },
    action_key: 'search',
  });

  t.deepEqual(descriptor.input_schema, base_schema);
  t.deepEqual(descriptor.output_schema, { type: 'array' });
  t.is(descriptor.description, 'Search contexts');
  t.is(descriptor.instruction, 'Find matches');
  t.deepEqual(descriptor.settings_config, { limit: { type: 'number' } });
  t.is(descriptor.tool.function.name, 'search');
  t.deepEqual(descriptor.tool.function.parameters, base_schema);
});

test('build_action_descriptor merges provided tool defaults', t => {
  const descriptor = build_action_descriptor({
    module: {
      description: 'Custom tool description',
      input_schema: base_schema,
      tool: {
        type: 'function',
        function: {
          name: 'custom_name',
          parameters: { type: 'object', properties: {} },
        },
      },
    },
    action_key: 'custom',
  });

  t.is(descriptor.tool.function.name, 'custom_name');
  t.is(descriptor.tool.function.description, 'Custom tool description');
  t.deepEqual(descriptor.tool.function.parameters.required, []);
});

test('build_action_descriptor uses openapi when schema is absent', t => {
  const descriptor = build_action_descriptor({
    module: {
      description: 'OpenAPI derived',
      openapi: {
        paths: {
          '/do': {
            post: {
              operationId: 'do',
              summary: 'Do the thing',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { value: { type: 'string' } },
                      required: ['value'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    action_key: 'do',
  });

  t.is(descriptor.tool.function.name, 'do');
  t.is(descriptor.tool.function.description, 'Do the thing');
  t.deepEqual(descriptor.input_schema.properties, { value: { type: 'string' } });
  t.deepEqual(descriptor.input_schema.required, ['value']);
});

test('build_action_descriptor throws when it cannot derive a schema', t => {
  const error = t.throws(() => build_action_descriptor({ module: { description: 'No schema' }, action_key: 'none' }));
  t.true(error.message.includes('schema'));
});
