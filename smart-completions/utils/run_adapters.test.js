import test from "ava";
import { SmartCompletionAdapter } from "../adapters/_adapter.js";
import { run_adapters } from "./run_adapters.js";

class FooAdapter extends SmartCompletionAdapter {
  static get property_name() { return "foo"; }
  static order = 1;
  async to_request() { this.item.data.called.push("foo_request"); }
  async from_response() { this.item.data.called.push("foo_response"); }
}

class BarAdapter extends SmartCompletionAdapter {
  static get property_name() { return null; }
  static order = -1;
  async to_request() { this.item.data.called.push("bar_request"); }
  async from_response() { this.item.data.called.push("bar_response"); }
}

test("run_adapters applies matching adapters before and after completion", async t => {
  const item = { data: { foo: true, completion: { request: {}, responses: [] }, called: [] } };
  const adapters = { foo: FooAdapter, bar: BarAdapter };
  await run_adapters({ item, adapters, adapter_method: "to_request" });
  t.deepEqual(item.data.called, ["bar_request", "foo_request"]);
  await run_adapters({ item, adapters, adapter_method: "from_response" });
  t.deepEqual(item.data.called, ["bar_request", "foo_request", "bar_response", "foo_response"]);
});

test("run_adapters skips adapters without matching data", async t => {
  const item = { data: { completion: { request: {}, responses: [] }, called: [] } };
  const adapters = { foo: FooAdapter };
  await run_adapters({ item, adapters, adapter_method: "to_request" });
  t.deepEqual(item.data.called, []);
});
