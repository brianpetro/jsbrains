import test from 'ava';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

import { SmartEnv } from 'smart-environment/smart_env.js';
import { NodeFsSmartFsAdapter } from 'smart-fs/adapters/node_fs.js';
import { SmartFs } from 'smart-fs/smart_fs.js';
import { SmartSettings } from 'smart-settings/smart_settings.js';

import { SmartSources, SmartSource } from 'smart-sources';
import { MarkdownSourceContentAdapter } from 'smart-sources/adapters/markdown_source.js';
import { SmartBlocks, SmartBlock } from 'smart-blocks';
import { MarkdownBlockContentAdapter } from 'smart-blocks/adapters/markdown_block.js';

import source_ajson_data_adapter from 'smart-sources/adapters/data/ajson_multi_file.js';
import block_ajson_data_adapter from 'smart-blocks/adapters/data/ajson_multi_file.js';
import group_ajson_data_adapter from 'smart-groups/adapters/data/ajson_multi_file.js';

import { SmartClusters, SmartCluster, source_cluster_adapter } from '../index.js';
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedTransformersAdapter } from 'smart-embed-model/adapters/transformers.js';

/**
 * Creates an environment pointing to `test/test-content` with SmartClusters.
 * If that folder does not exist, we run `test_content.js` to generate it.
 */
async function create_integration_env() {
  const testContentDir = path.join(process.cwd(), 'test', 'test-content');

  // If the folder doesn't exist, create it by running test_content.js
  if (!fs.existsSync(testContentDir)) {
    if(fs.existsSync('test/test_content.js')) { 
      execSync('node test/test_content.js');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      throw new Error(
        `Missing test_content.js script. ` +
        `Please provide one in test/test-content or run your existing script to create test data.`
      );
    }
  }

  // Now create a fresh environment:
  const env = await SmartEnv.create(
    {
      load_settings: () => ({}),
      save_settings: () => {},
      get settings() { return {}; },
    },
    {
      env_path: testContentDir,
      modules: {
        // minimal or real FS
        smart_fs: { class: SmartFs, adapter: NodeFsSmartFsAdapter },
        // basic settings
        smart_settings: { class: SmartSettings },
        // optional embed model
        smart_embed_model: {
          class: SmartEmbedModel,
          adapters: {
            transformers: SmartEmbedTransformersAdapter,
          },
        },
      },
      collections: {
        // The main source collection
        smart_sources: {
          class: SmartSources,
          data_adapter: source_ajson_data_adapter,
          source_adapters: {
            md: MarkdownSourceContentAdapter,
          }
        },
        // blocks
        smart_blocks: {
          class: SmartBlocks,
          data_adapter: block_ajson_data_adapter,
          block_adapters: {
            md: MarkdownBlockContentAdapter,
          }
        },
        // clusters
        smart_clusters: {
          class: SmartClusters,
          data_adapter: group_ajson_data_adapter,
          group_adapter: source_cluster_adapter
        },
      },
      item_types: {
        SmartSource,
        SmartBlock,
        SmartCluster,
      },
      default_settings: {
        smart_sources: {
          data_dir: 'multi',
          embed_model: {
            adapter: 'transformers',
            // Provide a placeholder or a smaller HF model if desired
            transformers: {
              legacy_transformers: false,
              model_key: 'TaylorAI/bge-micro-v2', 
              gpu_batch_size: 2
            },
          },
          min_chars: 10,
        },
        // cluster settings
        smart_clusters: {
          data_dir: 'clusters'
        }
      }
    }
  );

  return env;
}

test.before(async (t) => {
  // 1. Create environment
  t.context.env = await create_integration_env();

  // 2. Initialize items in sources
  await t.context.env.smart_sources.init_items();
  await t.context.env.smart_sources.process_load_queue();

  // 3. Import actual markdown from disk => parse blocks => embed
  await t.context.env.smart_sources.process_source_import_queue();

  // 4. Save any newly created items
  await t.context.env.smart_sources.process_save_queue();
});

test.after(async (t) => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // wait for final saves to ensure complete cleanup (should be removed in future)
  // Cleanup if you wish, or keep the data for debugging
  fs.rmdirSync(path.join(process.cwd(), 'test', 'test-content'), { recursive: true, force: true });
});

test.serial("Integration: Sources loaded with embeddings, able to cluster", async (t) => {
  const { env } = t.context;
  const sources = env.smart_sources;
  const clusters = env.smart_clusters;

  // confirm we have some sources in memory
  const allSources = Object.values(sources.items);
  t.true(allSources.length > 0, 'Should have multiple sources from test-content');
  
  // In a real scenario, they'd each have .vec after embedding
  const sourcesWithVec = allSources.filter((src) => src.vec);
  t.true(sourcesWithVec.length > 0, 'Some sources have .vec (embedding).');

  // Now cluster them
  clusters.settings.clusters_ct = 3; // e.g., 3 clusters
  clusters.settings.max_iterations = 5;
  await clusters.build_groups();

  const clusterItems = Object.values(clusters.items);
  t.true(clusterItems.length > 0, 'Should produce some cluster items');

  // Check membership
  let totalAssigned = 0;
  for (const cluster of clusterItems) {
    const { members, number_of_members } = cluster.data;
    totalAssigned += members?.length ?? 0;
    t.is(members?.length, number_of_members, 'members array length matches number_of_members field');
  }
  t.is(totalAssigned, sourcesWithVec.length, 'All vectorized sources assigned to some cluster');

  t.pass('Successfully built clusters from embedded sources.');
});

test.serial("Integration: Deleting a cluster reassigns its members to remaining clusters", async (t) => {
  const { env } = t.context;
  const clusters = env.smart_clusters;

  // pick the first cluster
  const existingClusters = Object.values(clusters.items);
  t.true(existingClusters.length >= 2, 'Need at least 2 clusters for reassignment test');
  const clusterToDelete = existingClusters[0];
  const membersBefore = clusterToDelete.data.members || [];

  // delete it
  await clusterToDelete.delete();

  // verify it's removed from the collection
  t.falsy(clusters.get(clusterToDelete.key), 'Deleted cluster item no longer in collection');

  // verify its members are found in some other cluster's .members
  const remainingClusters = Object.values(clusters.items);
  for (const mKey of membersBefore) {
    const wasReassigned = remainingClusters.some((c) => c.data.members?.includes(mKey));
    t.true(wasReassigned, `Member ${mKey} got reassigned to another cluster`);
  }
});

test.serial("Integration: Each cluster's center_source is among its .members", async (t) => {
  const { env } = t.context;
  const clusters = env.smart_clusters;

  for (const c of Object.values(clusters.items)) {
    t.truthy(c.data.center_source_key, 'Should define a center_source_key');
    t.true(
      c.data.members.includes(c.data.center_source_key),
      'The center source must be in the cluster members array.'
    );
  }
  t.pass("Center source is indeed part of that cluster's membership.");
});
