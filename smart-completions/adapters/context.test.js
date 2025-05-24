/**
 * @file context.test.js
 * @description Integration test for the SmartCompletionContextAdapter using a live SmartEnv environment.
 *
 * This test exercises the 'context' adapter, ensuring it creates an ephemeral SmartContext
 * and injects compiled context text into `completion.request.messages`.
 *
 * Requirements:
 *  - Uses a real SmartEnv environment
 *  - Loads 'smart-completions' and 'smart-sources' (and 'smart-contexts') modules
 *  - Builds `smart_env_config` by importing the necessary collections and modules
 *  - Should create test items in `smart_sources` collection to reference in the `context` adapter
 */

import test from 'ava';
import { SmartEnv } from 'smart-environment';
import { SmartFs } from 'smart-fs/smart_fs.js';
import { NodeFsSmartFsAdapter } from 'smart-fs/adapters/node_fs.js';
import { SmartSources } from 'smart-sources/smart_sources.js';
import { SmartSource } from 'smart-sources/smart_source.js';

import { SmartContexts } from 'smart-contexts';
import { SmartContext } from 'smart-contexts/smart_context.js';

import { SmartCompletions } from '../smart_completions.js';
import { SmartCompletion } from '../smart_completion.js';
import { SmartCompletionContextAdapter } from './context.js';

/**
 * A minimal 'main' object that provides `smart_env_config`.
 * We'll add only what's needed to demonstrate a live environment with:
 *   - smart_sources
 *   - smart_contexts
 *   - smart_completions
 */
class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }

  get smart_env_config() {
    return {
      env_path: 'test/test-content', // or some test directory
      modules: {
        smart_fs: {
          class: SmartFs,
          adapter: NodeFsSmartFsAdapter
        }
      },
      collections: {
        smart_sources: {
          class: SmartSources,
          // For brevity, let's rely on default multi-file AJSON or similar
          // If we wanted a custom data adapter, we could import it
        },
        smart_contexts: {
          class: SmartContexts
        },
        smart_completions: {
          class: SmartCompletions
        }
      },
      item_types: {
        SmartSource,
        SmartContext,
        SmartCompletion
      }
    };
  }
}

/**
 * Build a new environment, or reuse existing, for these tests.
 */
async function createTestEnv() {
  const main = new TestMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  // This ensures the collections are initialized. We can manually load items if needed.
  // We'll skip actual FS scanning or advanced logic for brevity here.
  return env;
}

/**
 * Utility: ensures we have some items in the smart_sources collection for referencing as 'context'.
 */
async function createTestSources(env) {
  // We'll create or update some minimal sources
  const sources = env.smart_sources;

  // source A
  const sourceA = sources.create_or_update({ key: 'test_source_a.md', path: 'test_source_a.md' });
  sourceA.data.content = "## Test Source A\nSome content for A\n";
  sourceA.queue_save();

  // source B
  const sourceB = sources.create_or_update({ key: 'test_source_b.md', path: 'test_source_b.md' });
  sourceB.data.content = "## Test Source B\nDifferent content for B\n";
  sourceB.queue_save();

  await sources.process_save_queue();
  // In a real environment, we'd do sources.process_load_queue() or import if needed.
}

/**
 * Tests
 */
test.before(async t => {
  t.context.env = await createTestEnv();
  await createTestSources(t.context.env);
});

test('integration: context adapter should compile ephemeral SmartContext and insert system message', async t => {
  const env = t.context.env;
  const completions = env.smart_completions;

  // We'll create a new SmartCompletion item that references some 'contexts'
  // We'll imagine the user wants to include sources 'test_source_a.md', 'test_source_b.md' in the ephemeral context
  const item = completions.create_or_update({
    data: {
      completion: {
        request: {
          messages: []
        }
      },
      // Either pass an array in data.contexts[] or data.context_items
      contexts: ['my_eph_context'] // We'll rely on a SmartContext in env.smart_contexts
    },
    key: 'test_completion_context'
  });

  // For the ephemeral context, we need an item in the `smart_contexts` collection with key='my_eph_context'
  const ctxCollection = env.smart_contexts;
  const ephemeralCtxItem = ctxCollection.create_or_update({
    key: 'my_eph_context',
    context_items: {
      'test_source_a.md': true,
      'test_source_b.md': true
    }
  });

  // Now we run the 'context' adapter
  const adapter = new SmartCompletionContextAdapter(item);

  t.is(item.data.completion.request.messages.length, 0, 'Initially no messages in request');

  // Act: to_request
  await adapter.to_request();

  const msgs = item.data.completion.request.messages;
  t.is(msgs.length, 1, 'Should have inserted exactly one system message');
  t.is(msgs[0].role, 'system', 'Injected message role is system');
  // We won't know the exact content, but we can do a basic check:
  t.true(msgs[0].content.includes('Test Source A'), 'System message should contain compiled context referencing source A content');
  t.true(msgs[0].content.includes('Test Source B'), 'System message should contain compiled context referencing source B content');
});

test('integration: context adapter does nothing if no contexts or context_items', async t => {
  const env = t.context.env;
  const completions = env.smart_completions;
  // create item with no contexts array
  const item = completions.create_or_update({
    data: {
      completion: {
        request: {
          messages: []
        }
      }
    },
    key: 'test_completion_no_ctx'
  });

  const adapter = new SmartCompletionContextAdapter(item);
  await adapter.to_request();

  t.is(item.data.completion.request.messages.length, 0, 'No system message added since no contexts');
});
