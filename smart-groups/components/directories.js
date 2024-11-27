import { render as render_directory } from "./directory.js";

export async function build_html(directories, opts = {}) {
  const html = `<div class="sg-directories-view">
    <div class="sg-top-bar">
      <div class="sg-actions">
        <button class="sg-refresh" aria-label="Refresh view">${this.get_icon_html('refresh-cw')}</button>
        <button class="sg-sort" aria-label="Sort directories">${this.get_icon_html('arrow-up-down')} ${directories.settings.sort_nearest ? 'nearest' : 'furthest'}</button>
        <button class="sg-subdirectories" aria-label="Show subdirectories">${directories.settings.show_subdirectories ? this.get_icon_html('folder-plus') : this.get_icon_html('folder-minus')}</button>
        <button class="sg-help" aria-label="Open help documentation">${this.get_icon_html('help-circle')}</button>
      </div>
    </div>
    <div class="sg-list">
    </div>
  </div>`;

  return html;
}

export async function render(directories, opts = {}) {
  const html = await build_html.call(this, directories, opts);
  const frag = this.create_doc_fragment(html);
  
  // Render each directory
  const sg_list = frag.querySelector('.sg-list');
  const directory_frags = await Promise.all(
    Object.values(directories.items)
      .filter(dir => directories.settings.show_subdirectories ? true : !dir.data.path.slice(0, -1).includes('/'))
      .sort((a, b) => a.data.path.localeCompare(b.data.path))
      .map(directory => 
        render_directory.call(this, directory, opts)
      )
  );
  directory_frags.forEach(dir_frag => sg_list.appendChild(dir_frag));

  return await post_process.call(this, directories, frag, opts);
}

export async function post_process(directories, frag, opts = {}) {
  // Refresh view
  const refresh_button = frag.querySelector(".sg-refresh");
  refresh_button.addEventListener("click", () => {
    opts.refresh_view();
  });

  // Help documentation
  const help_button = frag.querySelector(".sg-help");
  help_button.addEventListener("click", () => {
    window.open("https://docs.smartconnections.app/directories", "_blank");
  });

  // Sort directories
  const sort_button = frag.querySelector(".sg-sort");
  sort_button.addEventListener("click", () => {
    directories.settings.sort_nearest = !directories.settings.sort_nearest;
    opts.refresh_view();
  });

  // Show/hide subdirectories
  const subdirectories_button = frag.querySelector(".sg-subdirectories");
  subdirectories_button.addEventListener("click", () => {
    directories.settings.show_subdirectories = !directories.settings.show_subdirectories;
    opts.refresh_view();
  });

  return frag;
}
