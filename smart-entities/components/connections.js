export async function build_html(scope, opts = {}) {
  const results = scope.find_connections(opts);
  const resultsHtml = results.map(result => `
    <div class="search-result${!opts.expanded_view ? ' sc-collapsed' : ''}" data-path="${result.path.replace(/"/g, '&quot;')}" data-collection="${result.collection_key}">
      <span class="header">
        ${this.get_icon_html('right-triangle')}
        <a class="search-result-file-title" href="#" title="${result.path.replace(/"/g, '&quot;')}" draggable="true">
          <small>${[result.score?.toFixed(2), result.name].join(' | ')}</small>
        </a>
      </span>
      <ul draggable="true">
        <li class="search-result-file-title" title="${result.path.replace(/"/g, '&quot;')}" data-collection="${result.collection_key}" data-key="${result.key}"></li>
      </ul>
    </div>
  `).join('');

  const html = `
    <div class="sc-top-bar">
      <p class="sc-context" data-key="${scope.path}">
        ${scope.env.smart_sources.keys.length} (${scope.env.smart_blocks.keys.length})
      </p>
      <button class="sc-refresh">${this.get_icon_html('refresh-cw')}</button>
      <button class="sc-fold-all">${this.get_icon_html('fold-vertical')}</button>
      <button class="sc-unfold-all">${this.get_icon_html('unfold-vertical')}</button>
      <button class="sc-filter">${this.get_icon_html('sliders-horizontal')}</button>
      <button class="sc-search">${this.get_icon_html('search')}</button>
    </div>
    <div id="settings" class="sc-overlay"></div>
    <div class="sc-list">
      ${resultsHtml}
    </div>
    <div class="sc-bottom-bar">
      <span class="sc-context" data-key="${scope.path}" title="${scope.path}">
        ${scope.path.split('/').pop().split('.').shift()}${opts.re_ranked ? ' (re-ranked)' : ''}
      </span>
      ${scope.collection.attribution || ''}
    </div>
  `;

  return html;
}

export async function render(scope, opts = {}) {
  let html = await build_html.call(this, scope, opts);
  const frag = this.create_doc_fragment(html);
  return post_process.call(this, scope, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  const container = frag.querySelector('.sc-list');
  
  const resultPromises = Array.from(container.querySelectorAll(".search-result:not(.sc-collapsed)")).map(async (elm) => {
    const collection_key = elm.dataset.collection;
    const entity = scope.env[collection_key].get(elm.dataset.path);
    await entity.render_entity(elm.querySelector("li"), opts);
  });
  container.querySelectorAll(".search-result").forEach(elm => {
    if(typeof opts.add_result_listeners === 'function'){
      opts.add_result_listeners(elm);
    }
  });

  await Promise.all(resultPromises);

  return frag;
}