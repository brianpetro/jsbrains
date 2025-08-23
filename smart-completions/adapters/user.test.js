import test from 'ava';
import { SmartCompletionUserAdapter } from './user.js';

/**
 * Create minimal item for testing.
 * @param {string} msg
 */
function make_item(msg) {
  return {
    data: {
      user_message: msg,
      completion: { request: { messages: [] }, responses: [] }
    },
    response: {}
  };
}

test('SmartCompletionUserAdapter inserts user message', async t => {
  const item = make_item('hi');
  const adapter = new SmartCompletionUserAdapter(item);
  await adapter.to_request();
  t.is(item.data.completion.request.messages[0].role, 'user');
  t.deepEqual(item.data.completion.request.messages[0].content, [{ type: 'text', text: 'hi' }]);
});

test('SmartCompletionUserAdapter prepends message on repeat call', async t => {
  const item = make_item('first');
  const adapter = new SmartCompletionUserAdapter(item);
  await adapter.to_request();
  item.data.user_message = 'second';
  await adapter.to_request();
  t.deepEqual(item.data.completion.request.messages[0].content.map(c => c.text), ['second', 'first']);
});
