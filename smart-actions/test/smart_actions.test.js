import test from 'ava';
import { SmartActions } from '../smart_actions.js';
import { SmartAction } from '../smart_action.js';
import { SmartActionAdapter } from '../adapters/_adapter.js';

class InlineAdapter extends SmartActionAdapter {
  async load(){
    if (this.module) return;
    this.module = {
      description: 'Inline ping action',
      input_schema: { type: 'object', properties: {}, required: [] },
      default(){ return 'pong'; },
    };
  }
  async run(params){
    if (!this.module) await this.load();
    return this.module.default(params);
  }
}

const create_env = () => {
  const env = {
    settings: { smart_actions: {} },
    collections: {},
    config: {},
    create_env_getter(obj){ Object.defineProperty(obj, 'env', { value: env }); },
  };
  return env;
};

test('register_included_module attaches module and descriptor', async t => {
  const env = create_env();
  const actions = new SmartActions(env, { default_actions: {}, action_adapters: { default: InlineAdapter }, item_type: SmartAction });

  await actions.register_included_module('ping', { description: 'Inline ping action', input_schema: { properties: {} }, default(){ return 'pong'; } });
  const item = actions.get('ping');

  t.truthy(item);
  t.is(await item.run_action({}), 'pong');
  t.is(item.action_adapter.descriptor.description, 'Inline ping action');
});

test('register_included_module converts openapi to tool schema', async t => {
  class OpenApiAdapter extends SmartActionAdapter {
    async load(){
      this.module = {
        openapi: {
          paths: {
            '/do': {
              post: {
                operationId: 'do',
                summary: 'Do something',
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

  const env = create_env();
  const actions = new SmartActions(env, { default_actions: {}, action_adapters: { default: OpenApiAdapter }, item_type: SmartAction });

  await actions.register_included_module('do', { source_type: 'openapi' });
  const item = actions.get('do');
  await item.init();

  t.is(item.as_tool.function.name, 'do');
  t.truthy(item.as_tool.function.parameters.properties.text);
});
