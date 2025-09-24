// ava unit tests
import test from "ava";
import { create_actions_proxy } from "./create_actions_proxy.js";

/**
 * Thin OO wrapper showing integration with a host that keeps actions in env.
 * Keeps object-oriented surface minimal and delegates logic to the pure helper.
 */
class ItemHost {
  /**
   * @param {object} env container with opts.items[item_type_key].actions
   * @param {string} item_type_key key identifying the item type
   */
  constructor(env, item_type_key) {
    this.env = env;
    this.item_type_key = item_type_key;
    this._actions = null;
  }

  get_actions_source() {
    return this?.env?.opts?.items?.[this.item_type_key]?.actions || {};
  }

  get actions() {
    if (!this._actions) {
      const src = this.get_actions_source();
      this._actions = create_actions_proxy(this, src);
    }
    return this._actions;
  }

  refresh_actions() {
    this._actions = null;
    return this.actions;
  }
}

const make_env = (actions) => ({
  opts: {
    items: {
      t: { actions }
    }
  }
});

test("binds function to ctx lazily and caches the bound identity", (t) => {
  const calls = [];
  const actions = {
    ping() {
      calls.push(this.item_type_key);
      return `ok:${this.item_type_key}`;
    }
  };
  const host = new ItemHost(make_env(actions), "t");

  const fn1 = host.actions.ping;
  const fn2 = host.actions.ping;

  t.is(fn1, fn2);
  const out = fn1();
  t.deepEqual(calls, ["t"]);
  t.is(out, "ok:t");
});

test("returns non-function values as-is and caches them", (t) => {
  const actions = { version: 3 };
  const host = new ItemHost(make_env(actions), "t");

  // Accessing the proxy creates the snapshot
  const proxy = host.actions;

  // Mutate backing source after proxy creation
  host.env.opts.items.t.actions.version = 4;

  t.is(proxy.version, 3, "snapshot remains stable even if source mutates later");
});

test("caches undefined for misses and remains undefined without refresh", (t) => {
  const env = make_env({});
  const host = new ItemHost(env, "t");

  t.is(host.actions.missing, undefined);

  // Add after miss; without refresh it should stay undefined
  env.opts.items.t.actions.missing = function () { return `late:${this.item_type_key}`; };
  t.is(host.actions.missing, undefined);
});

test("refresh_actions rebuilds and picks up new values", (t) => {
  const env = make_env({});
  const host = new ItemHost(env, "t");

  t.is(host.actions.missing, undefined);

  env.opts.items.t.actions.missing = function () { return `hello:${this.item_type_key}`; };
  const refreshed = host.refresh_actions();
  t.truthy(refreshed);
  t.is(host.actions.missing(), "hello:t");
});

test("reflection parity for in, Object.keys, and getOwnPropertyDescriptor", (t) => {
  const actions = {
    a() { return "a"; },
    b: 7
  };
  const host = new ItemHost(make_env(actions), "t");

  t.true("a" in host.actions);
  t.true("b" in host.actions);

  const keys = Object.keys(host.actions).sort();
  t.deepEqual(keys, ["a", "b"]);

  const desc_a = Object.getOwnPropertyDescriptor(host.actions, "a");
  t.truthy(desc_a);
  t.is(typeof desc_a.value, "function");
  t.is(desc_a.enumerable, true);
  t.is(desc_a.configurable, true);

  const a1 = host.actions.a;
  const a2 = desc_a.value;
  t.is(a1, a2);
});

test("symbol keys are supported", (t) => {
  const S = Symbol.for("sym");
  const actions = {
    [S]: function () { return `s:${this.item_type_key}`; }
  };
  const host = new ItemHost(make_env(actions), "t");

  t.true(S in host.actions);
  t.is(host.actions[S](), "s:t");
});

test("writes affect only the proxy cache, not the source", (t) => {
  const env = make_env({ x: () => "x" });
  const host = new ItemHost(env, "t");

  host.actions.y = 42;

  t.is(host.actions.y, 42);
  t.true("y" in host.actions);
  t.false("y" in env.opts.items.t.actions);
});
