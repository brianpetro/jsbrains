/**
 * @file source.js (Alternative “k-centers” style)
 * @description 
 *   An alternative clustering adapter that exclusively uses a “k-centers” approach, 
 *   aiming to minimize the maximum distance (or equivalently, maximize the minimum similarity).
 */

import { ClusterCollectionAdapter, ClusterItemAdapter } from "./_adapter.js";
import { cos_sim } from "smart-entities/cos_sim.js";  // or from your local cos_sim
import { shuffle_array } from "../utils/shuffle_array.js";

/**
 * @class SourceClustersAdapterKCenters
 * @extends ClusterCollectionAdapter
 * @description
 *  Builds clusters by scanning `env.smart_sources` for items with a `.vec`,
 *  using a k-centers approach. The cluster "center" is always the actual 
 *  member in that cluster that minimizes maximum distance to all other members 
 *  in the cluster (i.e. `nearest_member`).
 */
export class SourceClustersAdapter extends ClusterCollectionAdapter {

  /**
   * Primary entrypoint: build the clusters from the `smart_sources`.
   * 
   * REQUIRED USER SETTINGS (in cluster `settings_config`):
   *   - `clusters_ct`
   *   - `max_iterations`
   * 
   * Optional: You could read from additional fields if desired, but here we only 
   * use `clusters_ct` (the number of clusters) and `max_iterations`.
   */
  async build_groups() {
    console.log("build_groups");
    // 1. Grab user config
    const {
      clusters_ct = 5,
      max_iterations = 10,
    } = this.collection.settings ?? {};  // or this.collection.settings_config

    // 2. Filter out any sources that lack a vector
    const sources = this.collection.env.smart_sources.filter(s => s?.vec);

    if (sources.length === 0) {
      console.warn("No sources with vectors found; skipping cluster build.");
      return;
    }

    // 3. CLEAR existing clusters (or you can mark them deleted)
    this._clear_existing_clusters();

    // 4. PICK initial cluster centers (k-centers style):
    //    pick 1 random, then repeatedly pick the source that is furthest from all chosen centers
    const centers = this._choose_initial_k_centers(sources, clusters_ct);

    // 5. Create cluster items for each center
    const clusterItems = await Promise.all(centers.map(async (centerSource, i) => {
      return await this.collection.create_or_update({
        key: centerSource.key,
        center_source_key: centerSource.key,
        name: `Cluster #${i + 1}`,
        members: [],
        number_of_members: 0,
        clustering_timestamp: Date.now(),
      });
    }));

    // 6. Refine clusters for up to max_iterations
    for (let iter = 0; iter < max_iterations; iter++) {
      let changed = false;

      // 6a. Assign every source to the nearest center
      //     We’ll track membership in a scratch map: clusterKey => arrayOfSourceKeys
      const newMembershipMap = {};
      clusterItems.forEach(ci => {
        newMembershipMap[ci.key] = [];
      });

      for (const src of sources) {
        // find cluster whose center yields the highest cos_sim
        let bestCluster = null;
        let bestSim = -Infinity;

        for (const ci of clusterItems) {
          const centerVec = this._get_center_vec(ci);
          if (!centerVec) continue;
          const sim = cos_sim(src.vec, centerVec);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = ci;
          }
        }

        if (bestCluster) {
          newMembershipMap[bestCluster.key].push(src.key);
        }
      }

      // 6b. For each cluster, pick the "nearest_member" that 
      //     minimizes the maximum distance to all other members 
      //     (or equivalently, maximizes min-sim).
      for (const ci of clusterItems) {
        const newMembers = newMembershipMap[ci.key] || [];
        ci.data.members = newMembers;  // store membership
        if (newMembers.length === 0) continue;

        // pick the new center by "nearest_member" logic
        const newCenterKey = this._find_nearest_member(ci, newMembers);
        if (newCenterKey && newCenterKey !== ci.data.center_source_key) {
          ci.data.key = newCenterKey;
          ci.data.center_source_key = newCenterKey;
          changed = true;
        }
      }

      if (!changed) {
        // no cluster center changed => stable
        break;
      }
    }

    console.log("clusterItems", clusterItems.map(ci => ci.key));
    // 7. Finalize cluster data
    clusterItems.forEach(ci => {
      ci.data.number_of_members = ci.data.members?.length ?? 0;
      ci.data.clustering_timestamp = Date.now();
      this.collection.set(ci);
      // Mark them for saving
      ci.queue_save();
    });
    console.log(Object.values(this.collection.items).length);
  }

  /**
   * Private helper: Choose K centers using a standard k-center approach:
   *  - pick 1 center at random
   *  - pick each subsequent center by finding the source that is furthest from any existing center
   */
  _choose_initial_k_centers(sources, k) {
    if (k >= sources.length) return sources.slice(0, k);

    const pickedCenters = [];
    // pick the first random
    const shuffled = shuffle_array([...sources]);
    pickedCenters.push(shuffled[0]);

    // pick the rest
    while (pickedCenters.length < k) {
      let bestCandidate = null;
      let bestDist = -Infinity;

      // for each source, compute distance to its nearest picked center
      // we want the one that is furthest from *all* picked centers
      for (const s of sources) {
        if (pickedCenters.includes(s)) continue;
        // find the highest sim among the already-chosen centers
        let nearestSim = -Infinity;
        for (const c of pickedCenters) {
          const sim = cos_sim(s.vec, c.vec);
          if (sim > nearestSim) {
            nearestSim = sim;
          }
        }
        // distance ~ 1 - sim, or we can just track sim
        // we want to maximize the distance => minimize the sim
        if (nearestSim < bestDist || bestDist < 0) {
          // we are looking for the source with the minimal "nearestSim"
          // so we actually want the smallest nearestSim
        }
        // Actually simpler: track `lowestSimSoFar` and pick the source whose `lowestSimSoFar` is smallest
        if (bestCandidate === null) {
          bestCandidate = s;
          bestDist = nearestSim;
        } else if (nearestSim < bestDist) {
          bestCandidate = s;
          bestDist = nearestSim;
        }
      }

      if (bestCandidate) {
        pickedCenters.push(bestCandidate);
      } else {
        // if none found, means all are accounted for
        break;
      }
    }

    return pickedCenters;
  }

  /**
   * Private helper: Clear existing clusters by removing items from the cluster collection.
   */
  _clear_existing_clusters() {
    const cluster_keys = Object.keys(this.collection.items);
    cluster_keys.forEach(k => {
      this.collection.delete_item(k); 
    });
  }

  /**
   * Private helper: Return the cluster's current center vector.
   * 
   * @param {SmartCluster} cluster 
   * @returns {number[] | null}
   */
  _get_center_vec(cluster) {
    const centerSource = this.collection.env.smart_sources.get(cluster.data.center_source_key);
    return centerSource?.vec || null;
  }

  /**
   * Private helper: Among `memberKeys`, pick the key that yields the smallest maximum distance 
   * (largest min-sim) to the other members in that cluster.
   * 
   * @param {SmartCluster} cluster 
   * @param {string[]} memberKeys 
   * @returns {string|null} chosen center source key
   */
  _find_nearest_member(cluster, memberKeys) {
    // if only 1 member, that must be center
    if (memberKeys.length === 1) return memberKeys[0];

    let bestKey = cluster.data.center_source_key ?? null;
    let bestScore = -Infinity;  // track the best "score"

    // convert keys to source objects
    const sources = memberKeys
      .map(k => this.collection.env.smart_sources.get(k))
      .filter(s => s?.vec);

    // for each candidate, measure the minimum cos_sim with others, or the average
    // "k-center" typically uses “minimize the maximum distance”, i.e. 
    // we measure the “worst-case similarity” from candidate to all others
    for (const candidate of sources) {
      let worstSim = Infinity;
      for (const other of sources) {
        if (other.key === candidate.key) continue;
        const sim = cos_sim(candidate.vec, other.vec);
        if (sim < worstSim) {
          worstSim = sim;
        }
      }
      // we want to maximize worstSim
      if (worstSim > bestScore) {
        bestScore = worstSim;
        bestKey = candidate.key;
      }
    }
    return bestKey;
  }
}

/**
 * @class SourceClusterAdapterKCenters
 * @extends ClusterItemAdapter
 * @description
 *  If needed, override any per-cluster item logic. Typically we rely on `SmartCluster` 
 *  for "delete => reassign" etc.
 */
export class SourceClusterAdapter extends ClusterItemAdapter {
  // no additional logic needed for a minimal example
}

export default {
  collection: SourceClustersAdapter,
  item: SourceClusterAdapter
};