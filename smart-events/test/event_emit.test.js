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

test('duplicate subscriptions of same function are independent; unsubscribe removes only one', t => {
  const env = { create_env_getter(target) { target.env = env; } };
  SmartEvents.create(env);
  let count = 0;
  const handler = () => { count++; };
  const unsub1 = env.events.on('ping', handler);
  const unsub2 = env.events.on('ping', handler);

  unsub1(); // should remove exactly the first registration
  env.events.emit('ping');
  t.is(count, 1); // second registration still active

  unsub2(); // now remove the second
  env.events.emit('ping');
  t.is(count, 1); // no further increments
});

test('off(key, fn) removes only the most recent matching registration (LIFO)', t => {
  const env = { create_env_getter(target) { target.env = env; } };
  SmartEvents.create(env);
  let count = 0;
  const handler = () => { count++; };
  env.events.on('k', handler);
  env.events.on('k', handler);
  env.events.off('k', handler); // remove one, keep one
  env.events.emit('k');
  t.is(count, 1);
});

test('callbacks with identical source but different closures are distinct', t => {
  const env = { create_env_getter(target) { target.env = env; } };
  SmartEvents.create(env);

  let a = 0, b = 0;
  const h1 = (() => { const x = 1; return () => { a += x; }; })();
  const h2 = (() => { const x = 2; return () => { b += x; }; })();

  env.events.on('z', h1);
  env.events.on('z', h2);

  env.events.off('z', h1); // should not remove h2
  env.events.emit('z');

  t.is(a, 0);
  t.is(b, 2);
});

test('once uses precise token and unsubscribes its exact entry', t => {
  const env = { create_env_getter(target) { target.env = env; } };
  SmartEvents.create(env);
  let count = 0;
  const unsub = env.events.once('q', () => { count++; });
  // Call the returned unsubscribe before the first emit; should remove that specific once handler.
  unsub();
  env.events.emit('q');
  t.is(count, 0);
});
