import test from 'ava';
import { SmartCompletionSystemAdapter } from './system.js';

/**
 * A mock environment item with minimal shape to test the adapter.
 */
function make_test_item(system_message) {
  return {
    data: {
      system_message,
      completion: {
        request: {
          messages: []
        },
        responses: []
      }
    },
    response: {}
  };
}

test('SmartCompletionSystemAdapter: does nothing if no system_message', async t => {
  const item = make_test_item('');
  const adapter = new SmartCompletionSystemAdapter(item);
  await adapter.to_request();
  t.deepEqual(item.data.completion.request.messages, []);
});

test('SmartCompletionSystemAdapter: prepends system role message if system_message exists', async t => {
  const item = make_test_item('This is my system prompt');
  const adapter = new SmartCompletionSystemAdapter(item);
  await adapter.to_request();

  t.is(item.data.completion.request.messages.length, 1);
  t.is(item.data.completion.request.messages[0].role, 'system');
  t.is(item.data.completion.request.messages[0].content, 'This is my system prompt');
});
