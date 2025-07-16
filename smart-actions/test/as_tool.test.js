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
