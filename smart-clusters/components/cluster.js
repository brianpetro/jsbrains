export async function render(scope, opts = {}) {
  const html = `<div class="sg-clusters-view">
    <h2>Clusters</h2>
    <p>View and manage your clusters below:</p>
    <div class="sg-cluster-list"></div>
  </div>`;
  const frag = this.create_doc_fragment(html);

  const list = frag.querySelector('.sg-cluster-list');
  // Render each cluster
  for (const cluster of Object.values(scope.items)) {
    const div = document.createElement('div');
    div.className = 'sg-cluster-item';
    div.innerHTML = `<h3>${cluster.data.name || cluster.key}</h3>
      <p>Members: ${cluster.data.member_keys.length}</p>`;
    list.appendChild(div);
  }

  return frag;
}
