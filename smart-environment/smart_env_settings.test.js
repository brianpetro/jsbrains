import test from "ava";
import { SmartFs } from "../smart-fs/smart_fs.js";
import { TestSmartFsAdapter } from "../smart-fs/adapters/_test.js";
import { SmartEnvSettings } from "./smart_env_settings.js";

class MockMain {
  constructor() {
    this.settings = {};
  }

  async save_settings(settings) {
    this.settings = settings;
  }

  async load_settings() {
    return this.settings;
  }
}

class MockEnv {
  constructor() {
    this.mock_main = new MockMain();
    this.mains = ["mock_main"];
    this.smart_fs_class = SmartFs;
    this.smart_fs_adapter_class = TestSmartFsAdapter;
  }
}

const smart_env_json = {
  other_setting: "other_value"
};

test.beforeEach(async (t) => {
  t.context.env = new MockEnv();
  t.context.smart_env_settings = new SmartEnvSettings(t.context.env, {
    fs_path: "/",
    env_data_dir: ".smart-env"
  });
  await t.context.smart_env_settings.fs.smart_env_data.write(".smart_env.json", JSON.stringify(smart_env_json));
});

test("SmartEnvSettings constructor initializes correctly", (t) => {
  const { smart_env_settings } = t.context;
  t.truthy(smart_env_settings.env);
  t.truthy(smart_env_settings.fs);
  t.deepEqual(smart_env_settings._settings, {});
  t.false(smart_env_settings._saved);
});

test("save method saves settings correctly", async (t) => {
  const { smart_env_settings, env } = t.context;
  const test_settings = {
    mock_main: { main_setting: "main_value" },
    other_setting: "other_value"
  };

  await smart_env_settings.save(test_settings);

  t.deepEqual(env.mock_main.settings, { main_setting: "main_value" });
  
  const saved_json = JSON.parse(await smart_env_settings.fs.smart_env_data.read(".smart_env.json"));
  t.deepEqual(saved_json, { other_setting: "other_value" });
  
  t.true(smart_env_settings._saved);
});

test("load method loads settings correctly", async (t) => {
  const { smart_env_settings, env } = t.context;
  env.mock_main.settings = { main_setting: "main_value" };

  await smart_env_settings.load();

  t.deepEqual(smart_env_settings._settings, {
    mock_main: { main_setting: "main_value" },
    other_setting: "other_value"
  });
  t.true(smart_env_settings._saved);
});

test("save method without arguments uses existing settings", async (t) => {
  const { smart_env_settings } = t.context;
  smart_env_settings._settings = {
    mock_main: { main_setting: "main_value" },
    other_setting: "other_value"
  };

  await smart_env_settings.save();

  const saved_json = JSON.parse(await smart_env_settings.fs.smart_env_data.read(".smart_env.json"));
  t.deepEqual(saved_json, { other_setting: "other_value" });
});

test("save method handles empty settings", async (t) => {
  const { smart_env_settings } = t.context;
  await smart_env_settings.save({});

  const saved_json = JSON.parse(await smart_env_settings.fs.smart_env_data.read(".smart_env.json"));
  t.deepEqual(saved_json, {});
});

test("load method handles missing smart_env.json", async (t) => {
  const { smart_env_settings } = t.context;
  await smart_env_settings.fs.smart_env_data.remove(".smart_env.json");

  await t.throwsAsync(async () => {
    await smart_env_settings.load();
  }, { instanceOf: Error });
});

test("save and load methods work together", async (t) => {
  const { smart_env_settings } = t.context;
  const test_settings = {
    mock_main: { main_setting: "main_value" },
    other_setting: "new_value"
  };

  await smart_env_settings.save(test_settings);
  await smart_env_settings.load();

  t.deepEqual(smart_env_settings._settings, test_settings);
});

test("save method handles multiple mains", async (t) => {
  const { smart_env_settings, env } = t.context;
  env.another_main = new MockMain();
  env.mains.push("another_main");

  const test_settings = {
    mock_main: { main_setting: "main_value" },
    another_main: { another_setting: "another_value" },
    other_setting: "other_value"
  };

  await smart_env_settings.save(test_settings);

  t.deepEqual(env.mock_main.settings, { main_setting: "main_value" });
  t.deepEqual(env.another_main.settings, { another_setting: "another_value" });

  const saved_json = JSON.parse(await smart_env_settings.fs.smart_env_data.read(".smart_env.json"));
  t.deepEqual(saved_json, { other_setting: "other_value" });
});

test("load method handles multiple mains", async (t) => {
  const { smart_env_settings, env } = t.context;
  env.another_main = new MockMain();
  env.mains.push("another_main");

  env.mock_main.settings = { main_setting: "main_value" };
  env.another_main.settings = { another_setting: "another_value" };

  await smart_env_settings.load();

  t.deepEqual(smart_env_settings._settings, {
    mock_main: { main_setting: "main_value" },
    another_main: { another_setting: "another_value" },
    other_setting: "other_value"
  });
});