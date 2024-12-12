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

import { readdir, stat, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

/**
 * Checks if a file exports a test object without executing it.
 * @param {string} file_path - Path to the JavaScript file
 * @returns {Promise<boolean>} True if file exports a test object
 */
async function has_test_exports(file_path) {
    try {
        // First read the file content to check if it's an AVA test
        const file_content = await readFile(file_path, 'utf-8');
        
        // Skip AVA test files
        if (file_content.includes('import test from "ava"') || 
            file_content.includes("import test from 'ava'") ||
            file_content.includes('require("ava")') ||
            file_content.includes("require('ava')")) {
            return false;
        }

        const module = await import(`file://${file_path}?t=${Date.now()}`);
        return module.test && Array.isArray(module.test.cases);
    } catch (error) {
        // Ignore JSON module experimental warnings
        if (error.message && error.message.includes('--experimental-json-modules')) {
            return false;
        }
        // Silently skip files that can't be imported
        return false;
    }
}

/**
 * Recursively collects test files from a given directory.
 * @param {string} dir_path - The directory path to search for `.js` files.
 * @returns {Promise<string[]>} A promise that resolves to an array of absolute file paths.
 */
async function collect_test_files(dir_path) {
    // Resolve path relative to current working directory
    const absolute_path = resolve(process.cwd(), dir_path);
    const entries = await readdir(absolute_path, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
        const full_path = join(absolute_path, entry.name);
        // Skip node_modules directory
        if (entry.isDirectory() && entry.name === 'node_modules') {
            continue;
        }
        if (entry.isDirectory()) {
            files.push(...await collect_test_files(full_path));
        } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.config.js')) {
            // Only include files that export a test object
            if (await has_test_exports(full_path)) {
                files.push(full_path);
            }
        }
    }
    return files;
}

/**
 * Runs all tests for a given test file's exported `test` object.
 * @param {string} file_path - The path to the test file.
 * @returns {Promise<{ passed: number; failed: number; skipped: number; time: number }>} Result summary.
 */
async function run_test_file(file_path) {
    const start_time = process.hrtime.bigint();
    
    try {
        const module = await import(`file://${file_path}`);
        const { test } = module;
        
        if (typeof test.setup === 'function') {
            try {
                await test.setup();
            } catch (error) {
                console.error(`❌ Setup failed for ${file_path}:`, error);
                return { passed: 0, failed: 1, skipped: test.cases.length - 1, time: 0 };
            }
        }

        let passed = 0, failed = 0, skipped = 0;
        
        for (const test_case of test.cases) {
            if (test_case.skip) {
                console.log(`⏭️  [${file_path}] Skipping "${test_case.name}"`);
                skipped++;
                continue;
            }

            if (typeof test.before_all === 'function') {
                await test.before_all.call(test_case);
            }

            if (typeof test_case.before === 'function') {
                await test_case.before.call(test_case);
            }

            try {
                await test_case.assert.call(test_case, assert);
                console.log(`✅ [${file_path}] "${test_case.name}" passed.`);
                passed++;
            } catch (error) {
                console.error(`❌ [${file_path}] "${test_case.name}" failed:`, error);
                failed++;
                
                // Break early if failFast is enabled
                if (test.failFast) break;
            } finally {
                if (typeof test_case.after === 'function') {
                    await test_case.after.call(test_case);
                }
            }
        }

        // Run teardown if present
        if (typeof test.teardown === 'function') {
            await test.teardown();
        }

        const end_time = process.hrtime.bigint();
        const duration_ms = Number(end_time - start_time) / 1_000_000;

        return { passed, failed, skipped, time: duration_ms };
    } catch (error) {
        console.error(`❌ Failed to load test file ${file_path}:`, error);
        return { passed: 0, failed: 1, skipped: 0, time: 0 };
    }
}

/**
 * Main entry point: runs all tests in the specified directory.
 */
(async () => {
    const dir_path = process.argv[2];
    if (!dir_path) {
        console.error("Usage: node run.js path/to/test/directory");
        process.exit(1);
    }

    try {
        const dir_stats = await stat(dir_path);
        if (!dir_stats.isDirectory()) {
            console.error("Provided path is not a directory.");
            process.exit(1);
        }

        console.log(`🔍 Collecting test files from: ${dir_path}`);
        const test_files = await collect_test_files(dir_path);
        
        if (test_files.length === 0) {
            console.warn("⚠️  No test files found!");
            process.exit(0);
        }

        console.log(`🚀 Running ${test_files.length} test files...\n`);
        
        const start_time = process.hrtime.bigint();
        let total_passed = 0, total_failed = 0, total_skipped = 0;
        
        for (const file of test_files) {
            const { passed, failed, skipped, time } = await run_test_file(file);
            total_passed += passed;
            total_failed += failed;
            total_skipped += skipped;
            
            if (time > 0) {
                console.log(`⏱️  ${file}: ${time.toFixed(2)}ms\n`);
            }
        }

        const end_time = process.hrtime.bigint();
        const total_time = Number(end_time - start_time) / 1_000_000;

        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed:  ${total_passed}`);
        console.log(`❌ Failed:  ${total_failed}`);
        console.log(`⏭️  Skipped: ${total_skipped}`);
        console.log(`⏱️  Time:    ${total_time.toFixed(2)}ms`);

        if (total_failed > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }
})();