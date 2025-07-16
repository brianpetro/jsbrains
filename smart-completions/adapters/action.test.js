import test from 'ava';
import { ActionCompletionAdapter, convert_openapi_to_tools } from '../adapters/action.js';

/**
 * Fake SmartAction collection item
 * @param {string} key 
 * @returns {object}
 */
function create_test_action_item(key) {
  return {
    key,
    module: {
      openapi: {
        paths: {
          '/test': {
            post: {
              summary: 'Test endpoint',
              operationId: 'my_test_action',
              parameters: [
                {
                  name: 'msg',
                  schema: { type: 'string' },
                  required: true
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      properties: { extra: { type: 'number' } },
                      required: []
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    run(args) {
      return Promise.resolve(`Result for key=${key}, args=${JSON.stringify(args)}`);
    },
    run_action(args) {
      return this.run(args);
    },
    get as_tool() {
      return convert_openapi_to_tools(this.module.openapi)[0];
    }
  };
}

test('ActionCompletionAdapter - end-to-end', async t => {
  // Prepare environment
  const env = {
    smart_actions: {
      get(k) {
        if (k === 'my_test_action') {
          return create_test_action_item(k);
        }
        return null;
      }
    }
  };

  // Fake 'item'
  const item = {
    env,
    data: {
      action_key: 'my_test_action',
      completion: {
        request: {
          messages: []
        }
      }
    },
    response: {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'my_test_action',
                  arguments: '{"msg":"hello","extra":10}'
                }
              }
            ]
          }
        }
      ]
    }
  };

  const adapter = new ActionCompletionAdapter(item);

  // to_request should insert the ephemeral tools
  await adapter.to_request();
  t.truthy(item.data.completion.request.tools, 'Tools should be inserted');
  t.truthy(item.data.actions.my_test_action, 'Action key should be set to true before completion');

  // from_response should parse the tool_call arguments and run the action
  await adapter.from_response();
  t.is(
    item.data.actions.my_test_action,
    'Result for key=my_test_action, args={"msg":"hello","extra":10}',
    'Result from action.run() should be stored in data.actions'
  );
});
