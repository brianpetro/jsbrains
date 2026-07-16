import test from "ava";
import { create_actions_proxy } from "./create_actions_proxy.js";

test("create_actions_proxy resolves and materializes only the requested action", t => {
  let unused_reads = 0;
  const base_actions = {
    selected: {
      action() {
        return "base";
      },
    },
  };
  Object.defineProperty(base_actions, "unused", {
    enumerable: true,
    get() {
      unused_reads += 1;
      return {
        action() {
          return "unused";
        },
      };
    },
  });

  const ctx = { key: "item" };
  const actions = create_actions_proxy(ctx, [
    base_actions,
    {
      selected: {
        action() {
          return this.key;
        },
      },
    },
  ]);

  t.is(unused_reads, 0);
  t.is(actions.selected(), "item");
  t.is(unused_reads, 0);
});

test("create_actions_proxy preserves scoped and ordered source precedence", t => {
  class ScopedItem {}
  ScopedItem.key = "smart_source";

  const item = new ScopedItem();
  const actions = create_actions_proxy(item, [
    {
      action_key() {
        return "global";
      },
      smart_source: {
        action_key() {
          return "base scoped";
        },
      },
    },
    {
      action_key() {
        return "override global";
      },
      smart_source: {
        action_key() {
          return "override scoped";
        },
      },
    },
  ]);

  t.is(actions.action_key(), "override scoped");
});

test("create_actions_proxy caches scoped bucket classification across proxies", t => {
  class ScopedItem {}
  ScopedItem.key = "smart_source";

  let own_keys_calls = 0;
  const scoped_actions = new Proxy({
    first_action() {
      return "first";
    },
    second_action() {
      return "second";
    },
  }, {
    ownKeys(target) {
      own_keys_calls += 1;
      return Reflect.ownKeys(target);
    },
  });
  const action_source = {
    first_action() {
      return "global";
    },
    smart_source: scoped_actions,
  };
  const first_actions = create_actions_proxy(new ScopedItem(), [action_source]);
  const second_actions = create_actions_proxy(new ScopedItem(), [action_source]);

  t.deepEqual(Object.keys(first_actions), ["first_action", "second_action"]);
  t.is(first_actions.first_action(), "first");
  t.is(own_keys_calls, 2);
  t.is(second_actions.second_action(), "second");
  t.is(own_keys_calls, 2);
});

test("create_actions_proxy caches bound actions and clones accessed action metadata", t => {
  const action_source = {
    action_key: {
      action() {
        return this;
      },
      settings_config: {
        nested: {
          value: 1,
        },
      },
    },
  };
  const first_item = { key: "first" };
  const second_item = { key: "second" };
  const first_actions = create_actions_proxy(first_item, [action_source]);
  const second_actions = create_actions_proxy(second_item, [action_source]);

  const first_action = first_actions.action_key;
  t.is(first_action, first_actions.action_key);
  t.is(first_action(), first_item);
  t.is(second_actions.action_key(), second_item);

  first_action.settings_config.nested.value = 2;
  t.is(second_actions.action_key.settings_config.nested.value, 1);
});

test("create_actions_proxy supports function, action object, and class registrations", t => {
  class ClassAction {
    constructor(ctx) {
      this.ctx = ctx;
    }

    run() {
      return this.ctx;
    }
  }

  const ctx = { key: "item" };
  const actions = create_actions_proxy(ctx, [{
    function_action() {
      return this;
    },
    object_action: {
      action() {
        return this;
      },
      display_name: "Object action",
    },
    class_action: ClassAction,
  }]);

  t.is(actions.function_action(), ctx);
  t.is(actions.object_action(), ctx);
  t.is(actions.object_action.display_name, "Object action");
  t.is(actions.class_action(), ctx);
  t.true(actions.class_action.instance instanceof ClassAction);
});

test("create_actions_proxy preserves reflection and local overrides", t => {
  class ScopedItem {}
  ScopedItem.key = "smart_source";

  const item = new ScopedItem();
  const actions = create_actions_proxy(item, [{
    global_action() {
      return "global";
    },
    smart_source: {
      scoped_action() {
        return "scoped";
      },
    },
    smart_block: {
      hidden_action() {
        return "hidden";
      },
    },
  }]);

  t.deepEqual(Object.keys(actions), ["global_action", "scoped_action"]);
  t.true("global_action" in actions);
  t.true("scoped_action" in actions);
  t.false("hidden_action" in actions);

  actions.global_action = () => "local";
  t.is(actions.global_action(), "local");
  delete actions.global_action;
  t.is(actions.global_action(), "global");
  t.is(Object.prototype.toString.call(actions), "[object ActionsProxy]");
});

test("shared action registries resolve current source values for new proxies", t => {
  const action_source = {
    action_key() {
      return "first";
    },
  };
  const first_actions = create_actions_proxy({}, [action_source]);

  t.is(first_actions.action_key(), "first");

  action_source.action_key = function action_key() {
    return "second";
  };
  const second_actions = create_actions_proxy({}, [action_source]);

  t.is(first_actions.action_key(), "first");
  t.is(second_actions.action_key(), "second");
});
