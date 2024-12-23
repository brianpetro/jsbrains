/**
 * @file source_clusters.js
 * @description Example adapter that demonstrates how to invoke the extracted `cluster_sources`
 * function from within the `build_groups` method.
 *
 * The `cluster_sources` utility is assumed to be defined or imported from another file,
 * e.g.:
 *
 *     import { cluster_sources } from '../utils/clustering_function.js';
 *
 * This example shows how to replace the original inlined clustering logic with
 * the extracted function.
 */

import { ClusterCollectionAdapter, ClusterItemAdapter } from "./_adapter.js";
import { cluster_sources } from "../utils/cluster_sources.js"; // <-- your extracted function

/**
 * @class SourceClustersAdapter
 * @extends ClusterCollectionAdapter
 * @description
 * Forms k clusters from vectorized sources, delegating clustering to `cluster_sources`.
 */
export class SourceClustersAdapter extends ClusterCollectionAdapter {
  /**
   * Build clusters of sources, with orphaned cluster logic:
   *  1) Setup config
   *  2) Collect vectorized sources
   *  3) Call `cluster_sources(...)`
   *  4) Persist results to the cluster collection
   */
  async build_groups() {
    const {
      max_iterations,
      clusters_ct,
    } = this.collection.settings ?? {};

    // 1) Gather vectorized sources
    const sources = this.collection.env.smart_sources.filter((s) => s?.vec);
    if (!sources.length) {
      console.warn(
        "[SourceClustersAdapter] No vectorized sources found; skipping cluster build."
      );
      return;
    }

    // 2) Clear existing clusters
    this._clear_existing_clusters();

    // 3) Invoke the extracted clustering function
    console.time('cluster_sources');
    const clusterData = cluster_sources(sources, {
      clusters_ct,
      max_iterations,
    });
    console.timeEnd('cluster_sources');

    // 4) Persist new cluster items to the in-memory collection
    for (const cObj of clusterData) {
      this.collection.create_or_update({
        key: cObj.key,
        center_source_key: cObj.center_source_key,
        members: cObj.members,
        number_of_members: cObj.number_of_members,
        last_cluster: {
          at: Date.now(),
        },
      });
    }

    console.log(
      `[SourceClustersAdapter] assigned ${sources.length} sources among ${
        clusterData.length
      } clusters.`
    );
  }

  /**
   * Clear out old cluster items from the collection
   * so we start fresh each time.
   * @private
   */
  _clear_existing_clusters() {
    for (const key of Object.keys(this.collection.items)) {
      this.collection.delete_item(key);
    }
  }
}

export class SourceClusterAdapter extends ClusterItemAdapter {
  // no changes needed for item-level
}

export default {
  collection: SourceClustersAdapter,
  item: SourceClusterAdapter,
};
