export async function render(scope, opts = {}) {
  const html = `
    <div class="sc-clusters-view">
      <h2>Smart Clusters</h2>
      <p>These are your automatically generated clusters based on source vectors.</p>
      <ul class="sc-cluster-list"></ul>
    </div>
  `;
  const frag = this.create_doc_fragment(html);

  const ul = frag.querySelector('.sc-cluster-list');
  Object.values(scope.items).forEach(cluster => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${cluster.name}</strong>
      <small>(Members: ${cluster.data.members?.length ?? 0})</small>
    `;
    ul.appendChild(li);
  });
  return frag;
}