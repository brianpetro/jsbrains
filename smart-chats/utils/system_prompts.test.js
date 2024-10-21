import test from 'ava';
import { contains_system_prompt_ref, extract_system_prompt_ref } from './system_prompts.js';

// Tests for contains_system_prompt_ref
test('contains_system_prompt_ref returns true for string with @"..."', t => {
    t.true(contains_system_prompt_ref('This is a @"system prompt" reference'));
});

test('contains_system_prompt_ref returns false for string without @"..."', t => {
    t.false(contains_system_prompt_ref('This is a normal string'));
});

test('contains_system_prompt_ref returns false for string with @ but no quotes', t => {
    t.false(contains_system_prompt_ref('This is an @email address'));
});

test('contains_system_prompt_ref returns true for multiple @"..." references', t => {
    t.true(contains_system_prompt_ref('Multiple @"references" in @"one string"'));
});

// Tests for extract_system_prompt_ref
test('extract_system_prompt_ref extracts single reference', t => {
    const { mentions, mention_pattern } = extract_system_prompt_ref('This is a @"system prompt" reference');
    t.deepEqual(mentions, ['system prompt']);
    t.truthy(mention_pattern);
});

test('extract_system_prompt_ref extracts multiple references', t => {
    const { mentions, mention_pattern } = extract_system_prompt_ref('Multiple @"references" in @"one string"');
    t.deepEqual(mentions, ['references', 'one string']);
    t.truthy(mention_pattern);
});

test('extract_system_prompt_ref returns empty array for no references', t => {
    const { mentions, mention_pattern } = extract_system_prompt_ref('This is a normal string');
    t.deepEqual(mentions, []);
    t.truthy(mention_pattern);
});

test('extract_system_prompt_ref ignores malformed references', t => {
    const { mentions, mention_pattern } = extract_system_prompt_ref('Malformed @reference and @"proper reference"');
    t.deepEqual(mentions, ['proper reference']);
    t.truthy(mention_pattern);
});

test('extract_system_prompt_ref handles paths', t => {
    const { mentions, mention_pattern } = extract_system_prompt_ref('@"path/to/prompt.md"');
    t.deepEqual(mentions, ['path/to/prompt.md']);
    t.truthy(mention_pattern);
});