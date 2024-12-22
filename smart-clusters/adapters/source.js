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
   * Build clusters of sources, with orphaned cluster logic:
   *  1) Setup config
   *  2) Collect vectorized sources
   *  3) Clear existing clusters
   *  4) Pick initial centers
   *  5) Iterative refinement (k iterations)
   *     - track cluster minSim, derive next iteration threshold
   *  6) Orphan assignment
   */
  async build_groups() {
    const {
      max_iterations = 10,
      max_cluster_size_percent = 0.3,
      clusters_ct = 5,
      // new settings:
      min_similarity_threshold_mode = 'lowest',
      orphan_cluster_key = 'orphaned',
    } = this.collection.settings ?? {};

    const sources = this.collection.env.smart_sources.filter(s => s?.vec);
    if (!sources.length) {
      console.warn("No vectorized sources found; skipping cluster build for SourceClustersAdapter.");
      return;
    }
    const max_cluster_size = Math.max(1, Math.floor(max_cluster_size_percent * sources.length));

    // 1) Remove existing clusters
    this._clear_existing_clusters();

    // 2) Build initial cluster items
    const centers = this._choose_initial_k_centers(sources, clusters_ct);
    const clusterItems = centers.map((src, i) => {
      const stableKey = `cluster_${i + 1}`;
      const item = this.collection.create_or_update({
        key: stableKey,
        center_source_key: src.key,
        members: [],
        number_of_members: 0,
        iteration_min_sim: null,          // track the cluster's min similarity
        clustering_timestamp: Date.now(),
      });
      return item;
    });

    // 2b) Create the orphan cluster item
    let orphanCluster = this.collection.get(orphan_cluster_key);
    if (!orphanCluster) {
      orphanCluster = this.collection.create_or_update({
        key: orphan_cluster_key,  // stable ID
        center_source_key: null,
        members: [],
        number_of_members: 0,
        iteration_min_sim: null,
        clustering_timestamp: Date.now(),
      });
    }

    // 3) Iterations with tracking minSim
    let changed = true;
    let globalThreshold = 0;  // we update each iteration if using 'lowest' or 'median' logic
    for (let iter = 0; iter < max_iterations && changed; iter++) {
      changed = false;

      // Build membership buckets
      const membershipMap = Object.fromEntries(clusterItems.map(ci => [ci.key, []]));

      // For each source, pick cluster with highest sim, subject to max_cluster_size
      // We'll keep track of the bestSim to each cluster center
      for (const src of sources) {
        const { bestClusterKey, bestSim } = this._pick_best_cluster(
          src, clusterItems, membershipMap, max_cluster_size
        );

        membershipMap[bestClusterKey].push(src.key);
      }

      // Recompute center + track iterationMinSim
      let anyCenterChanged = false;
      for (const ci of clusterItems) {
        const newMembers = membershipMap[ci.key];
        if (!newMembers.length) {
          ci.data.members = [];
          ci.data.iteration_min_sim = null;
          continue;
        }

        // find best center among newMembers
        const newCenterKey = this._find_nearest_member(newMembers);
        if (newCenterKey && newCenterKey !== ci.data.center_source_key) {
          ci.data.center_source_key = newCenterKey;
          anyCenterChanged = true;
        }
        // also compute iteration_min_sim for this cluster
        const cvec = this._get_center_vec(ci);
        if (cvec) {
          let clusterMinSim = 1.0;
          for (const mk of newMembers) {
            const s = this.collection.env.smart_sources.get(mk);
            if (!s?.vec) continue;
            const sim = cos_sim(s.vec, cvec);
            if (sim < clusterMinSim) clusterMinSim = sim;
          }
          ci.data.iteration_min_sim = clusterMinSim;
        }
        // finalize members
        ci.data.members = newMembers;
      }

      // pick global threshold from cluster min-sims (lowest, median, average, etc.)
      globalThreshold = this._pick_global_threshold(clusterItems, min_similarity_threshold_mode);

      if (anyCenterChanged) changed = true;
    }

    // 4) Orphan assignment pass
    // If a source is below the globalThreshold for all clusters, it goes to orphan cluster
    orphanCluster.data.members = []; // reset
    for (const ci of clusterItems) {
      // filter out items that don't meet threshold
      const keep = [];
      const orphaned = [];
      const cvec = this._get_center_vec(ci);
      for (const mk of ci.data.members) {
        const s = this.collection.env.smart_sources.get(mk);
        if (!s?.vec || !cvec) {
          orphaned.push(mk);
          continue;
        }
        const sim = cos_sim(s.vec, cvec);
        if (sim < globalThreshold) {
          // This item is an orphan
          orphaned.push(mk);
        } else {
          keep.push(mk);
        }
      }
      ci.data.members = keep;
      orphanCluster.data.members.push(...orphaned);
    }

    // finalize
    for (const ci of clusterItems) {
      ci.data.number_of_members = ci.data.members.length;
      ci.data.clustering_timestamp = Date.now();
      ci.queue_save();
    }
    orphanCluster.data.number_of_members = orphanCluster.data.members.length;
    orphanCluster.data.clustering_timestamp = Date.now();
    orphanCluster.data.center_source_key = orphanCluster.data.members[0];
    orphanCluster.queue_save();

    console.log(
      `[SourceClustersAdapter] assigned ${sources.length} sources among ${clusterItems.length} clusters + 1 orphan cluster.`
    );
  }

  /**
   * Picks a global threshold from cluster minSim. 
   * If min_similarity_threshold_mode = 'lowest', pick the max of [all cluster iteration_min_sim].
   * If 'median', pick the median. Adjust as you see fit.
   */
  _pick_global_threshold(clusterItems, mode) {
    const minSims = clusterItems
      .map(ci => ci.data.iteration_min_sim)
      .filter(v => typeof v === 'number');

    if (!minSims.length) return 0;

    switch (mode) {
      case 'lowest': {
        // largest among the cluster-minSims
        // Example: if cluster1 minSim=0.6, cluster2=0.4, cluster3=0.55 => pick 0.6
        // meaning items must be >= 0.6 to remain in that cluster
        return Math.max(...minSims);
      }
      case 'median': {
        // median approach
        const sorted = [...minSims].sort((a,b)=>a-b);
        const mid = Math.floor(sorted.length/2);
        if (sorted.length %2) return sorted[mid];
        return (sorted[mid-1] + sorted[mid])/2;
      }
      default:
        // fallback
        return 0;
    }
  }

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
        if (sim > bestSim) {
          bestSim = sim;
          bestClusterKey = ci.key;
        }
      }
      // fallback cluster is whichever has smallest membership, if all are full
      if (currCount < fallbackCount) {
        fallbackCount = currCount;
        fallbackKey = ci.key;
      }
    }
    if (!bestClusterKey && fallbackKey) {
      bestClusterKey = fallbackKey;
    }
    if (!bestClusterKey) {
      bestClusterKey = clusterItems[0].key;
    }
    return { bestClusterKey, bestSim };
  }

  _clear_existing_clusters() {
    for (const key of Object.keys(this.collection.items)) {
      this.collection.delete_item(key);
    }
  }

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
        // choose candidate with lowest bestSim => far from existing centers
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

  _get_center_vec(ci) {
    const centerSrc = this.collection.env.smart_sources.get(ci.data.center_source_key);
    return centerSrc?.vec || null;
  }

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
  // no changes needed for item-level
}

export default {
  collection: SourceClustersAdapter,
  item: SourceClusterAdapter
};
