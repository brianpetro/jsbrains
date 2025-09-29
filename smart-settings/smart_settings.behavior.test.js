import test from 'ava';
import { SmartSettings } from './smart_settings.js';

class MockEvents {
  constructor({ freeze = false } = {}) {
    this.calls = [];
    this.freeze = freeze;
  }
  emit(event_key, payload) {
    const event = this.freeze ? Object.freeze({ ...payload }) : payload;
    this.calls.push({ event_key, payload: event });
  }
  last_call() { return this.calls[this.calls.length - 1]; }
}

class MockMain {
  constructor(initial = {}, { attach_events_to_main = true, events_freeze = false } = {}) {
    this._store = clone_value(initial);
    this._events = new MockEvents({ freeze: events_freeze });
    if (attach_events_to_main) this.events = this._events;
    this.env = { events: this._events };
  }
  async load_settings() { return clone_value(this._store); }
  async save_settings(settings) { this._store = settings; }
}

function clone_value(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

async function setup(initial = {}, opts = {}) {
  const main = new MockMain(initial, opts);
  const smart_settings = await SmartSettings.create(main, { save_delay_ms: 5 });
  return { main, smart_settings, events: main.env.events };
}

function clear_save_timer(instance) {
  if (instance.save_timeout) {
    clearTimeout(instance.save_timeout);
    instance.save_timeout = null;
  }
}

test('no event when setting equal primitive value', async t => {
  const { main, smart_settings, events } = await setup({ x: 1 });
  main.settings.x = 1;
  clear_save_timer(smart_settings);
  t.is(events.last_call(), undefined);
});

test('array index update emits precise path', async t => {
  const { main, smart_settings, events } = await setup({ list: [0, 1, 2] });
  main.settings.list[1] = 10;
  clear_save_timer(smart_settings);
  const c = events.last_call();
  t.is(c.event_key, 'settings:changed');
  t.deepEqual(c.payload.path, ['list', '1']);
  t.is(c.payload.path_string, 'list.1');
  t.is(c.payload.value, 10);
  t.is(c.payload.type, 'set');
});

test('delete emits type delete and previous_value only', async t => {
  const { main, smart_settings, events } = await setup({ a: { b: 2 } });
  delete main.settings.a.b;
  clear_save_timer(smart_settings);
  const c = events.last_call();
  t.is(c.payload.type, 'delete');
  t.deepEqual(c.payload.path, ['a', 'b']);
  t.is(c.payload.previous_value, 2);
  t.is(c.payload.value, undefined);
});

test('debounce collapses multiple writes into one save', async t => {
  const { main } = await setup({ count: 0 });
  for (let i = 0; i < 5; i++) main.settings.count = i;
  await new Promise(r => setTimeout(r, 15));
  t.is(main._store.count, 4);
});

test('opts.emit is respected when provided', async t => {
  const calls = [];
  const emit = (key, payload) => calls.push({ key, payload });
  const main = new MockMain({});
  const smart = await SmartSettings.create(main, { emit, save_delay_ms: 0 });
  main.settings.flag = true;
  clear_save_timer(smart);
  t.is(calls.length, 1);
  t.is(calls[0].key, 'settings:changed');
  t.is(calls[0].payload.path_string, 'flag');
});

test('payload immutability when bus freezes', async t => {
  const { main, smart_settings } = await setup({}, { events_freeze: true });
  main.settings.user = { id: 1, name: 'A' };
  clear_save_timer(smart_settings);
  const event = main.env.events.last_call().payload;
  t.throws(() => { event.foo = 'bar'; }, { instanceOf: TypeError });
});
