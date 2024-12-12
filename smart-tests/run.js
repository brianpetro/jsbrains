/**
 * @fileoverview
 * A generic test runner that accepts a directory as an argument and runs
 * all test suites found within that directory. Each test file should export
 * a `test` object with optional `setup()` and `cases[]`.
 * 
 * Usage:
 *    node generic_test_runner.js path/to/test/directory
 * 
 * The test files are expected to:
 * - Export a `test` object.
 * - `test.setup` is an optional async function run before all test cases.
 * - `test.cases` is an array of test objects:
 *    {
 *      name: string,
 *      before?: () => Promise<void>,
 *      params?: object,
 *      assert: (assertModule: typeof import('node:assert/strict'), resp?: any) => Promise<void>
 *    }
 * 
 * This runner will attempt to run all `.js` files in the specified directory as tests.
 * Any test that fails will cause the process to exit with a non-zero code.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

/**
 * Recursively collects `.js` files from a given directory.
 * @param {string} dir_path - The directory path to search for `.js` files.
 * @returns {Promise<string[]>} A promise that resolves to an array of absolute file paths.
 */
async function collect_test_files(dir_path) {
    const entries = await readdir(dir_path, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full_path = join(dir_path, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collect_test_files(full_path));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(full_path);
        }
    }
    return files;
}

/**
 * Runs all tests for a given test file's exported `test` object.
 * @param {string} file_path - The path to the test file.
 * @returns {Promise<{ passed: number; failed: number; }>} Result summary of passed/failed tests.
 */
async function run_test_file(file_path) {
    const module = await import(`file://${file_path}`);
    if (!module.test || !Array.isArray(module.test.cases)) {
        console.error(`Skipping ${file_path}: no valid test object exported.`);
        return { passed: 0, failed: 0 };
    }

    const { test } = module;
    if (typeof test.setup === 'function') {
        await test.setup();
    }

    let passed = 0;
    let failed = 0;
    for (const testCase of test.cases) {
        if (typeof testCase.before === 'function') {
            await testCase.before.call(testCase);
        }
        try {
            await testCase.assert.call(testCase, assert);
            console.log(`✅ [${file_path}] Test case "${testCase.name}" passed.`);
            passed++;
        } catch (error) {
            console.error(`❌ [${file_path}] Test case "${testCase.name}" failed:`, error);
            failed++;
        }
    }

    return { passed, failed };
}

/**
 * Main entry point: runs all tests in the specified directory.
 */
(async () => {
    const dir_path = process.argv[2];
    if (!dir_path) {
        console.error("Usage: node generic_test_runner.js path/to/test/directory");
        process.exit(1);
    }

    // Validate directory
    let dir_stats;
    try {
        dir_stats = await stat(dir_path);
    } catch (error) {
        console.error("Invalid directory path:", error);
        process.exit(1);
    }

    if (!dir_stats.isDirectory()) {
        console.error("Provided path is not a directory.");
        process.exit(1);
    }

    const test_files = await collect_test_files(dir_path);

    let total_passed = 0;
    let total_failed = 0;
    for (const file of test_files) {
        const { passed, failed } = await run_test_file(file);
        total_passed += passed;
        total_failed += failed;
    }

    console.log(`All tests run: ${total_passed} passed, ${total_failed} failed.`);
    if (total_failed > 0) {
        process.exit(1);
    }
})();