import { render as render_result } from "../../smart-entities/components/result.js";

export async function build_html(directory, opts = {}) {
  const expanded_view = directory.env.settings.expanded_view;
  const sources = directory.direct_sources;
  const subdirs = directory.direct_subdirectories;
  
  return `<div class="directory-item${expanded_view ? '' : ' sg-collapsed'}" 
       data-path="${directory.data.path}"
       draggable="true">
    <div class="directory-header">
      ${this.get_icon_html('right-triangle')}
      <span class="directory-name" title="${directory.data.path}">
        ${directory.data.path.split('/').filter(p => p).pop() || 'root'}
      </span>
      <small class="directory-stats">
        ${sources.length} files${subdirs.length ? `, ${subdirs.length} subdirs` : ''}
      </small>
    </div>
    <div class="directory-content">
      <div class="subdirectories"></div>
      <div class="directory-sources"></div>
    </div>
  </div>`;
}

export async function render(directory, opts = {}) {
  const html = await build_html.call(this, directory, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, directory, frag, opts);
}

export async function post_process(directory, frag, opts = {}) {
  const dir_item = frag.querySelector('.directory-item');
  const sources_container = dir_item.querySelector('.directory-sources');
  const subdirs_container = dir_item.querySelector('.subdirectories');

  // Toggle expand/collapse
  const header = dir_item.querySelector('.directory-header');
  header.addEventListener('click', async () => {
    dir_item.classList.toggle('sg-collapsed');
    
    // Lazy load content when expanding
    if (!dir_item.classList.contains('sg-collapsed')) {
      await render_content(directory, sources_container, subdirs_container, opts);
    }
  });

  // Initial render if expanded
  if (!dir_item.classList.contains('sg-collapsed')) {
    await render_content(directory, sources_container, subdirs_container, opts);
  }

  return dir_item;
}

async function render_content(directory, sources_container, subdirs_container, opts) {
  // Clear existing content
  sources_container.innerHTML = '';
  subdirs_container.innerHTML = '';

  // Render sources sorted by similarity to directory median vector
  const sources = directory.direct_sources;
  const sorted_sources = sources.map(source => ({
    item: source,
    score: source.vec ? directory.env.smart_view.similarity(source.vec, directory.median_vec) : 0
  }))
  .sort((a, b) => b.score - a.score);

  const result_frags = await Promise.all(
    sorted_sources.map(result => 
      render_result.call(this, result, opts)
    )
  );
  result_frags.forEach(frag => sources_container.appendChild(frag));

  // Render subdirectories
  const subdirs = directory.direct_subdirectories;
  const subdir_frags = await Promise.all(
    subdirs.map(subdir => 
      render.call(this, subdir, opts)
    )
  );
  subdir_frags.forEach(frag => subdirs_container.appendChild(frag));
}
