import test from 'ava';
import { SmartAction } from '../smart_action.js';
import { SmartActionAdapter } from '../adapters/_adapter.js';

class DummyAdapter extends SmartActionAdapter {
  async load(){
    this.module = {
      tool: {
        type: 'function',
        function: {
          name: 'dummy',
          description: 'test',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      }
    };
  }
  async run(){ return 'ok'; }
}

test('as_tool returns adapter provided tool', async t => {
  const env = {
    settings: { smart_actions: {} },
    create_env_getter(obj){ Object.defineProperty(obj, 'env', { value: env }); },
  };
  env.smart_actions = { opts: { action_adapters: { dummy: DummyAdapter, default: DummyAdapter } }, items: {} };
  const action = new SmartAction(env, { key: 'dummy', source_type: 'dummy' });
  env.smart_actions.items['dummy'] = action;
  await action.init();
  const tool = action.as_tool;
  t.truthy(tool);
  t.is(tool.function.name, 'dummy');
});

test('as_tool builds tool from input_schema when no tool provided', async t => {
  class SchemaAdapter extends SmartActionAdapter {
    async load(){
      this.module = {
        description: 'Schema based action',
        input_schema: {
          properties: { term: { type: 'string' } },
          required: ['term'],
        },
      };
    }
    async run(){ return 'ok'; }
  }

  const env = {
    settings: { smart_actions: {} },
    create_env_getter(obj){ Object.defineProperty(obj, 'env', { value: env }); },
  };
  env.smart_actions = { opts: { action_adapters: { schema: SchemaAdapter, default: SchemaAdapter } }, items: {} };
  const action = new SmartAction(env, { key: 'schema', source_type: 'schema' });
  env.smart_actions.items['schema'] = action;
  await action.init();

  t.is(action.as_tool.function.name, 'schema');
  t.deepEqual(action.as_tool.function.parameters.required, ['term']);
});

test('as_tool derives from openapi when provided', async t => {
  class OpenApiAdapter extends SmartActionAdapter {
    async load(){
      this.module = {
        openapi: {
          paths: {
            '/echo': {
              post: {
                operationId: 'echo',
                summary: 'Echo input',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { text: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    }
    async run(){ return 'ok'; }
  }

  const env = {
    settings: { smart_actions: {} },
    create_env_getter(obj){ Object.defineProperty(obj, 'env', { value: env }); },
  };
  env.smart_actions = { opts: { action_adapters: { openapi: OpenApiAdapter, default: OpenApiAdapter } }, items: {} };
  const action = new SmartAction(env, { key: 'openapi', source_type: 'openapi' });
  env.smart_actions.items['openapi'] = action;
  await action.init();

  t.is(action.as_tool.function.name, 'echo');
  t.truthy(action.as_tool.function.parameters.properties.text);
});
