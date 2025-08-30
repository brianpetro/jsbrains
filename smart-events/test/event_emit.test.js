import test from 'ava';
import { SmartEvents } from '../smart_events.js';

test('emits event with payload and timestamp', t => {
  const env = { create_env_getter(target) { target.env = env; } };
  SmartEvents.create(env);
  let captured;
  env.events.on('test:event', e => { captured = e; });
  env.events?.emit('test:event', { id: 'foo' });
  t.is(captured.id, 'foo');
  t.truthy(captured.at);
});
