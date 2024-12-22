import { SmartGroups } from "smart-groups";

/**
 * @class SmartClusters
 * @extends SmartGroups
 * @classdesc
 * Manages a collection of `SmartCluster` items. Provides a `build_groups()` that calls the cluster adapter.
 */
export class SmartClusters extends SmartGroups {
  // E.g., store them under "clusters" folder or "multi" if desired
  get data_dir() { return 'clusters'; }

  async init(){
    await super.init();
    await this.create_or_update({key: 'orphaned'});
    await this.process_load_queue(); 
  }

  /**
   * Primary method that triggers the clustering adapter to create or update clusters.
   */
  async build_groups() {
    await this.cluster_adapter.build_groups();
    await this.process_save_queue();
  }

  /**
   * Return the cluster adapter specified in `opts.cluster_adapter` or the default.
   */
  get cluster_adapter() {
    if(!this._cluster_adapter) {
      const adapter_class = this.opts?.group_adapter?.collection;
      if(!adapter_class) throw new Error("No cluster adapter class provided. Configure `opts.group_adapter` in SmartClusters constructor.");
      this._cluster_adapter = new adapter_class(this);
    }
    return this._cluster_adapter;
  }

  /**
   * Example settings config that controls how many clusters, max iterations, etc.
   */
  get settings_config() {
    const base = super.settings_config || {};
    return {
      ...base,
      'clusters_ct': {
        name: "Number of Clusters",
        type: "number",
        default: 5,
        description: "How many clusters to form.",
      },
      'max_iterations': {
        name: "Max Iterations",
        type: "number",
        default: 10,
        description: "Maximum number of refinement iterations."
      },
      'centroid_type': {
        name: "Centroid Type",
        type: "select",
        options: ["mean", "median"],
        default: "mean",
        description: "Choose mean or median approach for computing cluster center."
      },
      'max_cluster_size_percent': {
        name: "Max Cluster Size (%)",
        type: "number",
        default: 0.3, // 30%
        description: "Each cluster can only hold up to this fraction of total sources."
      },
    };
  }
}