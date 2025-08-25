import test from 'ava';
import { SmartEvents } from '../smart_events.js';

test('create attaches getter to env and returns instance', t => {
  const env = {};
  const events = SmartEvents.create(env);
  t.truthy(events);
  t.is(env.events, events);
});

test('on and emit trigger listener', t => {
  const env = {};
  SmartEvents.create(env);
  let called = false;
  env.events.on('ping', () => { called = true; });
  env.events.emit('ping', {});
  t.true(called);
});

test('once triggers only once', t => {
  const env = {};
  SmartEvents.create(env);
  let count = 0;
  env.events.once('ping', () => { count++; });
  env.events.emit('ping');
  env.events.emit('ping');
  t.is(count, 1);
});

test('off removes listener', t => {
  const env = {};
  SmartEvents.create(env);
  let count = 0;
  const handler = () => { count++; };
  env.events.on('ping', handler);
  env.events.off('ping', handler);
  env.events.emit('ping');
  t.is(count, 0);
});

test('emit appends at timestamp', t => {
  const env = {};
  const now = () => 'now';
  SmartEvents.create(env, { now });
  let captured;
  const payload = { foo: 'bar' };
  env.events.on('ping', event => { captured = event; });
  env.events.emit('ping', payload);
  t.is(captured.at, 'now');
  t.is(payload.at, undefined);
  t.is(captured.foo, 'bar');
});

test('emit preserves existing at', t => {
  const env = {};
  const now = () => 'now';
  SmartEvents.create(env, { now });
  let captured;
  const payload = { at: 'before' };
  env.events.on('ping', event => { captured = event; });
  env.events.emit('ping', payload);
  t.is(captured.at, 'before');
});

test('emit freezes payload', t => {
  const env = {};
  SmartEvents.create(env);
  env.events.on('ping', event => {
    event.foo = 'baz';
  });
  t.throws(() => env.events.emit('ping', { foo: 'bar' }), { instanceOf: TypeError });
});

test('emit rejects non JSON-safe payloads', t => {
  const env = {};
  SmartEvents.create(env);
  t.throws(() => env.events.emit('fn', { bad: () => {} }));
  t.throws(() => env.events.emit('nested', { bad: { foo: 'bar' } }));
  class Foo {}
  t.throws(() => env.events.emit('instance', { bad: new Foo() }));
});
