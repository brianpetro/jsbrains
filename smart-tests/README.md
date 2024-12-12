# Project Overview

This repository demonstrates a standardized testing approach using a unified schema for test definitions. Tests are structured into a `test` object that can be easily discovered and run by a generic test runner.

## Key Components

- **Test Files**: Each file that needs testing exports a `test` object containing:
  - An optional `setup()` function to run once before all tests.
  - A `cases` array where each element defines a test case (`name`, `before`, `params`, and `assert`).
  
- **Generic Test Runner**: A runner script (e.g., `generic_test_runner.js`) that takes a directory as an argument, discovers all `.js` test files, and executes all test cases.

## Including Tests in the Same File as Code

In certain scenarios, placing tests in the same file as the code they test can be beneficial. For instance, a class or function can be immediately followed by its corresponding test definitions. This approach:

- **Improves Readability**: Having the test cases next to the code they exercise provides immediate visibility into what is being tested and why. It’s easier to see the intended usage and behavior of a class or function when the tests are co-located.
  
- **Encourages Maintenance**: When code and tests live together, updates to the code can be followed immediately by updates to its tests, reducing the risk of forgetting to update test coverage. It also lowers the cognitive load of switching between separate files just to understand or update related test logic.
  
- **Enhances Discoverability**: Developers exploring code often start from the source file. With the tests in the same location, they quickly gain insights into expected behaviors, edge cases, and how to properly use the functionality. This makes onboarding new team members or contributors more straightforward.

## Example Structure

For a `Counter` class test file (`counter_test.js`):

```js
export const test = {
  setup: async () => {
    // Load global config, if any
  },
  cases: [
    {
      name: "counter_starts_at_zero",
      before: async function () {
        this.counter = new Counter();
      },
      assert: async function (assert) {
        assert.strictEqual(this.counter.value, 0);
      },
    },
    // ...more test cases...
  ],
};
```

## Running Tests

Use the generic test runner to execute all tests in a given directory:

```bash
node generic_test_runner.js ./tests
```

This will:
- Recursively scan the `./tests` directory for `.js` files exporting `test` objects.
- Execute `setup()` once if defined.
- For each test case:
  - Run the `before()` hook if defined.
  - Execute the `assert()` function and report the results.

Any failures cause a non-zero exit code, making it suitable for CI/CD pipelines.

## Benefits

- **Consistency**: By following the described schema, all tests have a uniform structure, making them easier to maintain.
- **Discoverability**: Automated runners can easily identify and execute all tests without custom logic.
- **Flexibility**: You can adapt the schema to various test scenarios, from simple unit tests to integration tests.

## Next Steps

- Add more test cases following the standardized schema.
- Integrate the test runner into your CI/CD workflow.
- Enhance `setup()` and `before()` hooks to handle more complex test prerequisites as your project grows.
