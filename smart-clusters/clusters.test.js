/** 
 * @file clusters_env.test.js
 * @description Integration-level test demonstrating how to create clusters with `create_or_update`,
 *              using a real environment setup similar to `smart_sources` tests.
 */

import test from 'ava';
import { SmartEnv } from 'smart-environment';
import { SmartFs } from 'smart-fs';
import { NodeFsSmartFsAdapter } from 'smart-fs/adapters/node_fs.js';
import { Clusters } from './clusters.js';
import { Cluster } from './cluster.js';

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }

  get smart_env_config() {
    return {
      env_path: './test-env', // or any test folder location
      modules: {
        smart_fs: { class: SmartFs, adapter: NodeFsSmartFsAdapter }
      },
      collections: {
        clusters: {
          class: Clusters,
          // If you have a custom data adapter, define it here:
          // data_adapter: MyAjsonMultiFileClustersAdapter,
        }
      },
      item_types: {
        Cluster
      },
    };
  }
}

async function create_test_env() {
  const main = new TestMain();
  // Create and init environment
  return await SmartEnv.create(main, main.smart_env_config);
}

test.beforeEach(async t => {
  // Stand up environment before each test
  t.context.env = await create_test_env();
  await t.context.env.clusters.init();
});

test('Create new clusters using create_or_update', async t => {
  const { env } = t.context;
  const clusters = env.clusters;

  t.is(Object.keys(clusters.items).length, 0, 'No clusters yet');

  // Create first cluster using inherited create_or_update
  const cluster_a = await clusters.create_or_update({
    data: {
      center: {
        'some_item': { weight: 2 }
      }
    }
  });
  t.truthy(cluster_a.key, 'Cluster A has a generated key');
  t.is(Object.keys(clusters.items).length, 1, 'One cluster in the collection');

  // Create second cluster
  const cluster_b = await clusters.create_or_update({
    data: {
      center: {
        'another_item': { weight: 1 }
      }
    }
  });
  t.truthy(cluster_b.key, 'Cluster B has a key');
  t.is(Object.keys(clusters.items).length, 2, 'Two clusters in the collection');

  // Confirm they are distinct
  t.not(cluster_a.key, cluster_b.key, 'Cluster keys differ');

  // Force save to environment (if a file adapter is used, ensures .ajson or equivalent is updated)
  await clusters.process_save_queue();
});

test('Add and remove members, verify membership states', async t => {
  const { env } = t.context;
  const clusters = env.clusters;

  // Create a cluster
  const cluster1 = await clusters.create_or_update({
    data: {
      center: { alpha_item: { weight: 2 } }
    }
  });

  // Fake an item with .key, .vec
  const item_mock = {
    key: 'mock_item',
    data: { clusters: {} },
    vec: [0.1, 0.2, 0.3]
  };

  // Add member
  const added_res = cluster1.add_member(item_mock);
  t.is(cluster1.data.members[item_mock.key].state, 1, 'Member state is 1');
  t.is(item_mock.data.clusters[cluster1.key], 1, 'Item has membership = 1');
  t.truthy(added_res[cluster1.key].score >= 0, 'Returns a score');

  // Remove member
  const remove_res = cluster1.remove_member(item_mock);
  t.true(remove_res, 'remove_member returned true');
  t.is(cluster1.data.members[item_mock.key].state, -1, 'Member state is -1 after removal');
  t.is(item_mock.data.clusters[cluster1.key], -1, 'Item has membership = -1');

  // Save
  await clusters.process_save_queue();
});