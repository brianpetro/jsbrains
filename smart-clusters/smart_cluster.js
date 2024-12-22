import { SmartGroup } from "smart-groups";
import { cos_sim } from "../smart-entities/cos_sim.js";

export class SmartCluster extends SmartGroup {
  static get defaults() {
    return {
      data: {
        center_source_key: null,
        members: [],
        name: '',
        number_of_members: 0,
        clustering_timestamp: 0,
      }
    };
  }

  /**
   * cluster.center_vec is a getter returning cluster.center_source.vec
   * @returns {number[]|null}
   */
  get center_vec() {
    return this.center_source?.vec || null;
  }
  get vec() { return this.center_vec; }
  get group_vec() { return this.center_vec; }

  /**
   * cluster.center_source is a getter returning the source instance
   * from env.smart_sources.get(cluster.data.center_source_key)
   */
  get center_source() {
    if(!this.data.center_source_key) return null;
    return this.env.smart_sources.get(this.data.center_source_key);
  }

  async delete() {
    // 1) Reassign members
    const allClusters = Object.values(this.collection.items)
      .filter(c => c.key !== this.key);

    if (allClusters.length) {
      this.data.members.forEach(mKey => {
        const source = this.env.smart_sources.get(mKey);
        if (!source?.vec) return;

        // find the best new cluster
        let best = { cluster: null, sim: -Infinity };
        allClusters.forEach(cluster => {
          const cvec = cluster.center_vec;
          if (!cvec) return;
          const sim = cos_sim(source.vec, cvec);
          if (sim > best.sim) best = { cluster, sim };
        });
        if (best.cluster) {
          best.cluster.data.members.push(mKey);
          best.cluster.queue_save();
        }
      });
    } else {
      console.warn("No other clusters exist; members are un-clustered.");
    }

    // 2) Actually remove from the collection in-memory:
    this.collection.delete_item(this.key);

    // If you also want to mark it `deleted` for AJSON logs:
    this.deleted = true;
    this.queue_save();
  }
}