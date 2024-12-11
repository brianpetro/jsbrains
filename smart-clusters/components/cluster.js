export async function render(scope, opts = {}) {
  const html = `<div class="sg-clusters-view">
    <h2>Clusters</h2>
    <p>Here we will list the clusters and their members, along with actions to regenerate or rename.</p>
    <div class="sg-cluster-list"></div>
  </div>`;
  const frag = this.create_doc_fragment(html);
  // Future: render each cluster
  return frag;
}
