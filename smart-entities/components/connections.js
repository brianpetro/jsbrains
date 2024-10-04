export async function build_html(scope, opts = {}) {
  const results = scope.find_connections(opts);
  const resultsHtml = results.map(result => `
    <div class="search-result${!opts.expanded_view ? ' sc-collapsed' : ''}" data-path="${result.path.replace(/"/g, '&quot;')}" data-collection="${result.collection_key}">
      <span class="header">
        ${this.get_icon('right-triangle')}
        <a class="search-result-file-title" title="${result.path.replace(/"/g, '&quot;')}" draggable="true">
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
        ${scope.collection.notes_ct} (${scope.collection.blocks_ct})
      </p>
      <button class="sc-refresh">${this.get_icon('refresh-cw')}</button>
      <button class="sc-fold-all">${this.get_icon('fold-vertical')}</button>
      <button class="sc-unfold-all">${this.get_icon('unfold-vertical')}</button>
      <button class="sc-filter">${this.get_icon('sliders-horizontal')}</button>
      <button class="sc-search">${this.get_icon('search')}</button>
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
  
  this.add_top_bar_listeners(frag, scope);

  const resultPromises = Array.from(container.querySelectorAll(".search-result")).map(async (elm) => {
    const collection_key = elm.dataset.collection;
    const entity = scope.env[collection_key].get(elm.dataset.path);
    await entity.render_entity(elm.querySelector("li"));
    this.add_link_listeners(elm, entity, scope);
  });

  await Promise.all(resultPromises);

  return frag;
}

export function render_entity(elm, entity, scope) {
  if (elm.innerHTML) return;
  
  if (!entity) {
    elm.innerHTML = `<p>Entity not found: ${elm.dataset.key}</p>
                     <button class="sc-refresh-entity">Refresh embeddings</button>`;
    elm.querySelector('.sc-refresh-entity').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      scope.env.smart_sources.prune();
    });
    return;
  }
  
  entity.render_entity(elm);
}

export function add_top_bar_listeners(frag, scope) {
  const container = frag;
  
  container.querySelector(".sc-fold-all").addEventListener("click", () => {
    container.querySelectorAll(".search-result").forEach((elm) => elm.classList.add("sc-collapsed"));
    scope.settings.expanded_view = false;
  });

  container.querySelector(".sc-unfold-all").addEventListener("click", () => {
    container.querySelectorAll(".search-result").forEach((elm) => {
      elm.classList.remove("sc-collapsed");
      const collection_key = elm.dataset.collection;
      const entity = scope.env[collection_key].get(elm.dataset.path);
      this.render_entity(elm.querySelector("li"), entity, scope);
      this.add_link_listeners(elm.querySelector("li"), entity, scope);
    });
    scope.settings.expanded_view = true;
  });

  container.querySelector(".sc-filter").addEventListener("click", () => {
    scope.render_filter_settings();
    scope.on_open_overlay();
  });

  container.querySelector(".sc-refresh").addEventListener("click", () => {
    scope.refresh_smart_view();
  });

  container.querySelector(".sc-search").addEventListener("click", () => {
    scope.render_search_view();
  });

  container.querySelectorAll(".sc-context").forEach(el => {
    const entity = scope.env.smart_sources.get(el.dataset.key);
    if(entity) {
      el.addEventListener("click", () => {
        scope.open_note_inspect_modal(entity);
      });
    }
  });
}

export function add_link_listeners(elm, item, scope) {
  elm.addEventListener("click", (event) => scope.handle_search_result_click(event, elm));
  
  if(item.path) {
    elm.setAttr('draggable', 'true');
    elm.addEventListener('dragstart', (event) => scope.handle_drag_start(event, item));
    
    if (item.path.indexOf("{") === -1) {
      elm.addEventListener("mouseover", (event) => scope.trigger_hover_link(event, elm, item));
    }
  }
}