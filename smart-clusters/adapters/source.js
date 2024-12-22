/**
 * @file source_clusters.js
 * @description Example of a stable k-center clustering adapter for SmartClusters.
 */

import { ClusterCollectionAdapter, ClusterItemAdapter } from "./_adapter.js";
import { cos_sim } from "smart-entities/cos_sim.js";
import { shuffle_array } from "../utils/shuffle_array.js";

/**
 * @class SourceClustersAdapter
 * @extends ClusterCollectionAdapter
 * @description
 * Forms k clusters from vectorized sources, using a k-center approach.
 * - Each cluster gets a stable ID (e.g. "cluster_0", "cluster_1", etc.).
 * - We keep a `center_source_key` on each cluster item. That is updated if needed (never rename the actual cluster key).
 * - Respects `max_cluster_size_percent` to limit cluster size.
 */
export class SourceClustersAdapter extends ClusterCollectionAdapter {
  /**
   * Build clusters of sources. The user’s cluster settings are read from `this.collection.settings`.
   */
  async build_groups() {
    // 1) Config from settings
    const {
      max_iterations = 10,
      max_cluster_size_percent = 0.3,
    } = this.collection.settings ?? {};
    // 2) Collect all vectorized sources
    const sources = this.collection.env.smart_sources.filter(s => s?.vec);
    let clusters_ct = 5;
    if(!this.collection.settings?.clusters_ct) {
      clusters_ct = Math.max(clusters_ct, Math.floor(sources.length/100));
    }
    console.log(`[SourceClustersAdapter] Building ${clusters_ct} clusters from ${sources.length} sources.`);
    if (!sources.length) {
      console.warn("No vectorized sources found; skipping cluster build.");
      return;
    }
    const max_cluster_size = Math.max(
      1,
      Math.floor(max_cluster_size_percent * sources.length)
    );

    // 3) Remove existing clusters from memory
    this._clear_existing_clusters();

    // 4) Pick initial cluster centers
    const centers = this._choose_initial_k_centers(sources, clusters_ct);

    // 5) Create cluster items with stable IDs: "cluster_0", "cluster_1", etc.
    const clusterItems = centers.map((src, i) => {
      const stableKey = `cluster_${i + 1}`;
      const item = this.collection.create_or_update({
        key: stableKey,        // stable ID
        center_source_key: src.key,
        members: [],
        number_of_members: 0,
        clustering_timestamp: Date.now(),
      });
      return item;
    });

    // 6) Iterate & refine
    let changed = true;
    for (let iter = 0; iter < max_iterations && changed; iter++) {
      changed = false;

      // Build new membership arrays keyed by stable cluster ID
      const membershipMap = Object.fromEntries(
        clusterItems.map(ci => [ci.key, []])
      );

      // Assign each source
      for (const src of sources) {
        const { bestClusterKey } = this._pick_best_cluster(
          src, clusterItems, membershipMap, max_cluster_size
        );
        membershipMap[bestClusterKey].push(src.key);
      }

      // Recompute center
      for (const ci of clusterItems) {
        const newMembers = membershipMap[ci.key];
        ci.data.members = newMembers;
        if (!newMembers.length) continue;

        // find best center among newMembers
        const newCenterKey = this._find_nearest_member(newMembers);
        if (newCenterKey && newCenterKey !== ci.data.center_source_key) {
          ci.data.center_source_key = newCenterKey;
          changed = true;
        }
      }
    }

    // 7) Finalize membership
    for (const ci of clusterItems) {
      ci.data.number_of_members = ci.data.members.length;
      ci.data.clustering_timestamp = Date.now();
      ci.queue_save();
    }

    // Debug check: total assigned must match
    const totalAssigned = clusterItems.reduce((sum, ci) => sum + ci.data.members.length, 0);
    console.log(
      `[SourceClustersAdapter] Assigned ${totalAssigned} sources among ${clusterItems.length} clusters. ` +
      `We started with ${sources.length} vectorized sources.`
    );
  }

  /**
   * For each source, pick the cluster that has the highest cos_sim with that cluster’s center
   * as long as it’s not “full” (under max_cluster_size).
   * If all are full, pick whichever cluster has the fewest members.
   */
  _pick_best_cluster(src, clusterItems, membershipMap, maxSize) {
    let bestClusterKey = null;
    let bestSim = -Infinity;

    let fallbackKey = null;
    let fallbackCount = Infinity;

    for (const ci of clusterItems) {
      const centerVec = this._get_center_vec(ci);
      if (!centerVec) continue;

      const sim = cos_sim(src.vec, centerVec);

      const currCount = membershipMap[ci.key].length;
      if (currCount < maxSize) {
        // normal assignment
        if (sim > bestSim) {
          bestSim = sim;
          bestClusterKey = ci.key;
        }
      }
      // track the cluster with smallest membership for fallback
      if (currCount < fallbackCount) {
        fallbackCount = currCount;
        fallbackKey = ci.key;
      }
    }

    // If bestClusterKey is still null, fallback
    if (!bestClusterKey && fallbackKey) {
      bestClusterKey = fallbackKey;
    }

    if (!bestClusterKey) {
      // Should not happen if we have at least one cluster
      console.warn(`No cluster assigned for source ${src.key}?`);
      bestClusterKey = clusterItems[0].key;
    }
    return { bestClusterKey };
  }

  // Remove them from memory so they won't linger
  _clear_existing_clusters() {
    for (const key of Object.keys(this.collection.items)) {
      this.collection.delete_item(key);
    }
  }

  // k-center “plus plus” approach: pick the first at random, then pick each subsequent
  // with minimal similarity to existing picks
  _choose_initial_k_centers(sources, k) {
    if (k >= sources.length) return sources.slice(0, k);

    const picked = [];
    const shuffled = shuffle_array([...sources]);
    picked.push(shuffled[0]);

    while (picked.length < k) {
      let bestCandidate = null;
      let bestDist = Infinity;
      for (const s of sources) {
        if (picked.includes(s)) continue;
        let nearestSim = -Infinity;
        for (const c of picked) {
          const sim = cos_sim(s.vec, c.vec);
          if (sim > nearestSim) nearestSim = sim;
        }
        // pick the candidate with the lowest “bestSim” (i.e. far from all chosen)
        if (nearestSim < bestDist) {
          bestDist = nearestSim;
          bestCandidate = s;
        }
      }
      if (!bestCandidate) break;
      picked.push(bestCandidate);
    }
    return picked;
  }

  // Return the center’s vector from the cluster’s stored center_source_key
  _get_center_vec(ci) {
    const centerSrc = this.collection.env.smart_sources.get(ci.data.center_source_key);
    return centerSrc?.vec || null;
  }

  /**
   * Among the cluster’s newMembers, pick the item with largest “worstSim” to all others.
   * This ensures the chosen center is the “most central” in a k-center sense.
   */
  _find_nearest_member(memberKeys) {
    if (memberKeys.length === 1) return memberKeys[0];

    const sources = memberKeys
      .map(k => this.collection.env.smart_sources.get(k))
      .filter(s => s?.vec);

    let bestKey = sources[0]?.key;
    let bestScore = -Infinity;
    for (const cand of sources) {
      let worstSim = Infinity;
      for (const other of sources) {
        if (other.key === cand.key) continue;
        const sim = cos_sim(cand.vec, other.vec);
        if (sim < worstSim) worstSim = sim;
      }
      if (worstSim > bestScore) {
        bestScore = worstSim;
        bestKey = cand.key;
      }
    }
    return bestKey;
  }
}

export class SourceClusterAdapter extends ClusterItemAdapter {
  // no changes needed for the item-level
}

export default {
  collection: SourceClustersAdapter,
  item: SourceClusterAdapter
};
