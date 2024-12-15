import { render as render_results } from "../../smart-entities/components/results.js";

export async function build_html(directory, opts = {}) {
  const expanded_view = opts.expanded_view || directory.env.settings.expanded_view;
  const sources = directory.direct_sources;
  const subdirs = directory.direct_subdirectories;
  
  return `<div class="sg-directory-item${expanded_view ? '' : ' sg-collapsed'}" 
       data-path="${directory.data.path}"
       draggable="true">
    <div class="sg-directory-header">
      ${this.get_icon_html('right-triangle')}
      <span class="sg-directory-name" title="${directory.data.path}">
        ${directory.data.path.slice(0, -1)}
      </span>
      <small class="sg-directory-stats">
        ${sources.length} files${subdirs.length ? `, ${subdirs.length} subdirs` : ''}
      </small>
    </div>
    <div class="sg-directory-content">
      <div class="sg-subdirectories sc-list"></div>
      <div class="sg-directory-sources sc-list"></div>
    </div>
  </div>`;
}

export async function render(directory, opts = {}) {
  const html = await build_html.call(this, directory, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, directory, frag, opts);
}

export async function post_process(directory, frag, opts = {}) {
  const dir_item = frag.querySelector('.sg-directory-item');
  const sources_container = dir_item.querySelector('.sg-directory-sources');
  const subdirs_container = dir_item.querySelector('.sg-subdirectories');

  // Toggle expand/collapse with enhanced event handling
  const header = dir_item.querySelector('.sg-directory-header');

  // Handle header click (including icon) - toggle expand/collapse
  header.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    const was_collapsed = dir_item.classList.contains('sg-collapsed');
    dir_item.classList.toggle('sg-collapsed');
    
    // Only load content when expanding and content not already loaded
    if (was_collapsed && !sources_container.innerHTML.trim()) {
      await render_content.call(this, directory, sources_container, subdirs_container, opts);
    }
  });

  // Initialize based on expanded state
  const start_expanded = opts.expanded_view || directory.env.settings.expanded_view;
  if (start_expanded) {
    dir_item.classList.remove('sg-collapsed');
    await render_content.call(this, directory, sources_container, subdirs_container, opts);
  }

  return dir_item;
}

async function render_content(directory, sources_container, subdirs_container, opts) {
  // Only render if not already rendered
  if (!sources_container.innerHTML.trim()) {
    sources_container.innerHTML = '';
    subdirs_container.innerHTML = '';

    const results = directory.settings.sort_nearest
      ? await directory.get_nearest_sources_results()
      : await directory.get_furthest_sources_results();
    const result_frags = await render_results.call(this, results, opts);
    sources_container.appendChild(result_frags);
  }
}
