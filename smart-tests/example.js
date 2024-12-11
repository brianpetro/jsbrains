// This file provides an example of a testing pattern using classes,
// following the `test` object approach for universal, discoverable tests.
// The pattern can be applied consistently across various modules or files
// to create a uniform testing experience.

/**
 * @fileoverview
 * Demonstrates a testing pattern for classes using a standardized `test` export.
 *
 * # Testing Pattern
 * Each file that needs testing exports a `test` object with the following structure:
 * - An optional `setup` function: This runs once before all test cases, used for global initialization.
 * - A `cases` array: Each element is a test case object with:
 *   - `name`: A unique string identifier for the test case.
 *   - `before` (optional): An async function that runs before the test case, typically used
 *     for setting up a clean state or loading test-specific resources.
 *   - `params`: An object containing parameters to pass to the action being tested (may or may not be used).
 *   - `assert`: An async function receiving `(assert, resp)`, where:
 *       - `assert` is the assertion library instance (e.g. Node.js `assert` module).
 *       - `resp` is the result of executing the action or logic under test.
 *     The `assert` function should contain one or more assertions to verify correct behavior.
 *
 * An optional `run()` method may also be provided for convenience, allowing tests to be invoked
 * directly if needed. In practice, a separate test harness would import the `test` object and execute
 * these tests. The `run()` method is just a demonstration of how tests might be integrated.
 *
 * # Example
 * This example tests a simple `Counter` class to ensure that it initializes at zero, increments
 * correctly, and resets properly. Each test case uses a `before` hook to create a fresh instance of
 * `Counter` to avoid state leakage between tests.
 */

import assert from 'node:assert/strict';

/**
 * A simple counter class.
 * @class
 */
class Counter {
  /**
   * Initializes the counter to zero.
   */
  constructor() {
    /** @type {number} Current value of the counter. */
    this.value = 0;
  }

  /**
   * Increments the counter by 1.
   * @returns {number} The new value of the counter after incrementing.
   */
  increment() {
    return ++this.value;
  }

  /**
   * Resets the counter back to zero.
   * @returns {void}
   */
  reset() {
    this.value = 0;
  }
}

/**
 * Test suite object containing setup and cases for testing the Counter class.
 * 
 * @type {{ 
 *   setup?: () => Promise<void>, 
 *   cases: Array<{ 
 *     name: string, 
 *     before?: () => Promise<void>, 
 *     params?: object, 
 *     assert: (assert: typeof import('node:assert/strict'), resp?: any) => Promise<void> 
 *   }>, 
 *   run?: () => Promise<void>
 * }}
 */
export const test = {
  /**
   * Optional setup function: runs once before all test cases.
   * In this example, we have no global initialization, so it is empty.
   * 
   * @async
   * @returns {Promise<void>}
   */
  setup: async () => {
    // Could be used to load configuration, initialize data, etc.
  },

  /**
   * An array of test cases. Each case sets up a fresh Counter instance
   * in `before()` to ensure tests run independently and do not share state.
   */
  cases: [
    {
      name: "counter_starts_at_zero",
      before: async function () {
        /**
         * We store the Counter instance on `this` so it's accessible in `assert()`.
         * @property {Counter} this.counter
         */
        this.counter = new Counter();
      },
      params: {},
      assert: async function (a) {
        a.strictEqual(this.counter.value, 0, "Counter should start at zero");
      },
    },
    {
      name: "increment_increases_value",
      before: async function () {
        this.counter = new Counter();
      },
      params: {},
      assert: async function (a) {
        const newValue = this.counter.increment();
        a.strictEqual(newValue, 1, "Increment should return 1 on first call");
        a.strictEqual(this.counter.value, 1, "Counter value should be 1 after increment");
      },
    },
    {
      name: "reset_sets_value_to_zero",
      before: async function () {
        this.counter = new Counter();
        this.counter.increment(); // value now 1
      },
      params: {},
      assert: async function (a) {
        this.counter.reset();
        a.strictEqual(this.counter.value, 0, "Counter value should be 0 after reset");
      },
    },
    {
      name: "increment_multiple_times",
      before: async function () {
        this.counter = new Counter();
      },
      params: {},
      assert: async function (a) {
        this.counter.increment(); // value: 1
        this.counter.increment(); // value: 2
        this.counter.increment(); // value: 3
        a.strictEqual(this.counter.value, 3, "After three increments, value should be 3");
      },
    },
  ],

  /**
   * Optional run function to execute tests directly. This is mainly for demonstration.
   * In real usage, a dedicated test harness would import and execute these tests.
   * 
   * @async
   * @returns {Promise<void>}
   */
  run: async () => {
    // Run global setup if provided.
    if (typeof test.setup === 'function') await test.setup();

    // Run each test case.
    for (const testCase of test.cases) {
      // If a `before` function is provided, run it.
      // Using `call(testCase)` allows storing test-related state on `this`.
      if (typeof testCase.before === 'function') await testCase.before.call(testCase);

      // In this example, we are not calling a separate action function,
      // since we are testing the class directly.
      // The `assert` method performs the checks, using `this.counter`.
      await testCase.assert.call(testCase, assert);

      console.log(`Test case "${testCase.name}" passed.`);
    }

    console.log("All tests passed.");
  },
};

// Example of how tests might be run directly (e.g., from Node.js):
// (async () => {
//   await test.run().catch(err => {
//     console.error("Test run failed:", err);
//     process.exit(1);
//   });
// })();
