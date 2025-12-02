import test from 'ava';
import { SmartModel } from '../smart_model.js';

// Mock Adapter
class MockAdapter {
  constructor(model) {
    this.model = model;
    this.loaded = false;
  }
  async load() {
    this.loaded = true;
  }
  async unload() {
    this.loaded = false;
  }
  async mock_method(arg) {
    return `Processed: ${arg}`;
  }
}

// Another Mock Adapter for Testing Switching
class AnotherMockAdapter {
  constructor(model) {
    this.model = model;
    this.loaded = false;
  }
  async load() {
    this.loaded = true;
  }
  async unload() {
    this.loaded = false;
  }
  async another_mock_method(arg) {
    return `Another processed: ${arg}`;
  }
}

// Extended SmartModel for Tests
class TestSmartModel extends SmartModel {
  get default_model_key() {
    return 'mock_model';
  }

  get models() {
    return {
      mock_model: {
        adapter: 'mock',
        description: 'Mock model for testing',
      },
      another_mock_model: {
        adapter: 'another_mock',
        description: 'Another mock model for testing',
      },
    };
  }
}

test.beforeEach((t) => {
  t.context.defaultOpts = {
    adapters: {
      mock: MockAdapter,
      another_mock: AnotherMockAdapter,
    },
    settings: {
      model_key: 'mock_model',
    },
  };
});


test('Model is in unloaded state upon instantiation', (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  t.true(model.is_unloaded);
  t.false(model.is_loading);
  t.false(model.is_loaded);
  t.false(model.is_unloading);
});

test('Initialize loads the adapter and sets state to loaded', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  t.true(model.adapter.loaded);
  t.true(model.is_loaded);
  t.false(model.is_loading);
  t.false(model.is_unloading);
  t.false(model.is_unloaded);
});

test('Load method loads the adapter and sets state to loaded', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.load();
  t.true(model.adapter.loaded);
  t.true(model.is_loaded);
});

test('Unload method unloads the adapter and sets state to unloaded', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  await model.unload();
  t.false(model.adapter.loaded);
  t.true(model.is_unloaded);
  t.false(model.is_loaded);
});

test('Switching to a different adapter unloads the current and loads the new adapter', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  t.true(model.adapter.loaded);
  t.is(model.adapter.constructor.name, 'MockAdapter');

  // Switch to another adapter
  await model.load_adapter('another_mock');
  t.true(model.adapter.loaded);
  t.is(model.adapter.constructor.name, 'AnotherMockAdapter');
  t.true(model.is_loaded);
});

test('Switching to the same adapter does not reload and maintains loaded state', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  const initialLoadState = model.adapter.loaded;
  await model.load_adapter('mock');
  t.true(model.adapter.loaded);
  t.is(model.state, 'loaded');
  t.is(model.adapter.loaded, initialLoadState);
});

test('Delegating method calls to adapter works correctly', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  const result = await model.invoke_adapter_method('mock_method', 'test input');
  t.is(result, 'Processed: test input');
});

test('Delegating method calls to another adapter works correctly after switching', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  await model.load_adapter('another_mock');
  const result = await model.invoke_adapter_method('another_mock_method', 'another test input');
  t.is(result, 'Another processed: another test input');
});

test('Invoking a non-existent adapter method throws an error', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  await model.initialize();
  const error = await t.throwsAsync(() => model.invoke_adapter_method('non_existent_method'));
  t.is(error.message, 'Adapter does not implement method: non_existent_method');
});

test('Loading an invalid adapter name throws an error', async (t) => {
  const model = new TestSmartModel(t.context.defaultOpts);
  const error = await t.throwsAsync(() => model.load_adapter('invalid_adapter'));
  t.is(error.message, 'Adapter "invalid_adapter" not found.');
});

test('Processing settings_config with conditional settings excludes irrelevant settings before loading', (t) => {
  class ConditionalSmartModel extends SmartModel {
    get default_model_key() {
      return 'conditional_model';
    }

    get models() {
      return {
        conditional_model: {
          adapter: 'mock',
          description: 'Model with conditional settings',
        },
      };
    }

    get settings_config() {
      return this.process_settings_config({
        setting_one: {
          type: 'string',
        },
        setting_two: {
          type: 'number',
        },
      });
    }
  }

  const opts = {
    adapters: {
      mock: MockAdapter,
    },
    settings: {
      model_key: 'conditional_model',
    },
  };

  const model = new ConditionalSmartModel(opts);

  // Before loading, conditional setting should be excluded
  const config_before = model.settings_config;
  t.true(config_before.hasOwnProperty('setting_one'));
  t.false(config_before.hasOwnProperty('setting_two'));
});

test('Processing settings_config with conditional settings includes relevant settings after loading', async (t) => {
  class ConditionalSmartModel extends SmartModel {
    get default_model_key() {
      return 'conditional_model';
    }

    get models() {
      return {
        conditional_model: {
          adapter: 'mock',
          description: 'Model with conditional settings',
        },
      };
    }

    get settings_config() {
      return this.process_settings_config({
        setting_one: {
          type: 'string',
        },
        setting_two: {
          type: 'number',
        },
      });
    }
  }

  const opts = {
    adapters: {
      mock: MockAdapter,
    },
    settings: {
      model_key: 'conditional_model',
    },
  };

  const model = new ConditionalSmartModel(opts);
  await model.initialize();

  // After loading, conditional setting should be included
  const config_after = model.settings_config;
  t.true(config_after.hasOwnProperty('setting_one'));
  t.true(config_after.hasOwnProperty('setting_two'));
});