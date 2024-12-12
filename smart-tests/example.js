/**
 * @fileoverview
 * A standardized test schema for testing modules and classes. The schema follows a pattern where each test file 
 * exports a `test` object that can be consumed by a common test runner. This `test` object provides an optional 
 * `setup()` function for global initialization and a `cases` array. Each element in `cases` describes a single 
 * test case including setup steps, parameters, and assert logic.
 * 
 * # Schema Explanation
 * The `test` object is designed to be easily discoverable and runnable by a generic test runner. It defines:
 * - An optional `setup()` function that runs once before all test cases to perform global initializations.
 * - A `cases` array where each element is an object representing a single test scenario.
 * 
 * Each test case object can have:
 * - `name`: A unique string identifier for the test case.
 * - `before` (optional): An async function that runs before the test case’s `assert` function. This allows you 
 *   to set up a clean, test-specific state, such as creating a new instance of a class being tested.
 * - `params` (optional): An object containing configuration or input parameters relevant to the test. This can 
 *   be used by `before()` or `assert()` to influence the test’s setup or assertions.
 * - `assert`: An async function that receives:
 *    - `assert`: An assertion library instance (e.g., Node.js `assert` module) to perform assertions.
 *    - `resp` (optional): Represents the response or result under test, if applicable.
 *   
 * In the example below, we test a `Counter` class. Each test case uses a `before()` hook to create a fresh 
 * `Counter` instance. This ensures that no state leaks between test cases, promoting deterministic results.
 *
 * @type {{
*   setup?: () => Promise<void>,
*   cases: Array<{
*     /**
*      * Name of the test case. This is a human-readable unique identifier that 
*      * describes the behavior being tested. It is used by test runners to report 
*      * which tests have passed or failed.
*      * @type {string}
*      */
*     name: string,
* 
*     /**
*      * An optional async function that runs before the `assert` function. If defined, 
*      * this function is used to set up the test environment or instantiate objects needed 
*      * during the actual test run. For example, it can create a new instance of the class 
*      * being tested and store it on `this` for `assert` to use.
*      * 
*      * @async
*      * @returns {Promise<void>}
*      */
*     before?: () => Promise<void>,
* 
*     /**
*      * An optional object containing configuration or parameters needed for the test. 
*      * These can be referenced by `before()` or `assert()` to influence setup logic or 
*      * assertions. For instance, you might supply a parameter indicating how many times 
*      * a method should be called before checking its value.
*      * 
*      * @type {object}
*      */
*     params?: object,
* 
*     /**
*      * The main assertion function that performs the actual test checks. It must be async.
*      * Receives `assert`, which is the Node.js strict assertion module, and optionally `resp`, 
*      * which represents the outcome of the logic under test if relevant. Typically, `resp` 
*      * might hold the return value of a function call being tested. In this particular 
*      * schema, we rely on `before()` setting the state (such as `this.counter`) so that 
*      * `assert()` can verify post-conditions.
*      * 
*      * @async
*      * @param {typeof import('node:assert/strict')} assert - The assertion library for 
*      * validating test outcomes.
*      * @param {*} [resp] - Optional result under test, if applicable.
*      * @returns {Promise<void>}
*      */
*     assert: (assert: typeof import('node:assert/strict'), resp?: any) => Promise<void>
*   }>
* }}
*/
export const test = {
 /**
  * Optional setup function that runs once before all test cases. Use this to load configuration, 
  * initialize databases, or perform any global setup needed by all test cases. In this example, 
  * we do not require global setup, so it is left empty.
  * 
  * @async
  * @returns {Promise<void>}
  */
 setup: async () => {
   // Could be used to load configuration, initialize data, etc.
 },

 /**
  * An array of test cases that verify various behaviors of the `Counter` class. Each test case 
  * uses a `before()` hook to create a new `Counter` instance and ensures that no state leaks 
  * between tests, making the suite deterministic and reliable.
  */
 cases: [
   {
     name: "counter_starts_at_zero",
     before: async function () {
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
};