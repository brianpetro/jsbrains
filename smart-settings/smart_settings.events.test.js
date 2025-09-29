import test from 'ava';
import { SmartSettings } from './smart_settings.js';

class MockEvents {
  constructor() {
    this.calls = [];
  }

  emit(event_key, payload) {
    this.calls.push({ event_key, payload });
  }

  last_call() {
    return this.calls[this.calls.length - 1];
  }
}

class MockMain {
  constructor(initial_settings = {}, opts = {}) {
    this._store = clone_value(initial_settings);
    this._events = new MockEvents();
    if (opts.attach_events_to_main !== false) {
      this.events = this._events;
    }
    this.env = { events: this._events };
  }

  async load_settings() {
    return clone_value(this._store);
  }

  async save_settings(settings) {
    this._store = settings;
  }
}

function clone_value(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

async function setup(initial_settings = {}, opts = {}) {
  const main = new MockMain(initial_settings, opts);
  const smart_settings = await SmartSettings.create(main);
  return { main, smart_settings, events: main.env.events };
}

function clear_save_timer(instance) {
  if (instance.save_timeout) {
    clearTimeout(instance.save_timeout);
    instance.save_timeout = null;
  }
}

test('emits settings:changed with path for top-level updates', async t => {
  const { main, smart_settings, events } = await setup();
  main.settings.theme = 'dark';
  clear_save_timer(smart_settings);

  const last_call = events.last_call();
  t.truthy(last_call);
  t.is(last_call.event_key, 'settings:changed');
  t.deepEqual(last_call.payload.path, ['theme']);
  t.is(last_call.payload.path_string, 'theme');
  t.is(last_call.payload.value, 'dark');
  t.is(last_call.payload.type, 'set');
});

test('emits nested path when inner property changes', async t => {
  const { main, smart_settings, events } = await setup();
  main.settings.profile = { theme: 'dark' };
  clear_save_timer(smart_settings);

  main.settings.profile.theme = 'light';
  clear_save_timer(smart_settings);

  const last_call = events.last_call();
  t.truthy(last_call);
  t.is(last_call.event_key, 'settings:changed');
  t.deepEqual(last_call.payload.path, ['profile', 'theme']);
  t.is(last_call.payload.path_string, 'profile.theme');
  t.is(last_call.payload.value, 'light');
  t.is(last_call.payload.previous_value, 'dark');
  t.is(last_call.payload.type, 'set');
});

test('falls back to env events bus when main.events is missing', async t => {
  const { main, smart_settings, events } = await setup({ filters: { quick: true } }, { attach_events_to_main: false });
  delete main.events;

  delete main.settings.filters.quick;
  clear_save_timer(smart_settings);

  const last_call = events.last_call();
  t.truthy(last_call);
  t.is(last_call.event_key, 'settings:changed');
  t.deepEqual(last_call.payload.path, ['filters', 'quick']);
  t.is(last_call.payload.path_string, 'filters.quick');
  t.is(last_call.payload.previous_value, true);
  t.is(last_call.payload.type, 'delete');
});
