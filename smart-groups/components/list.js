import { render as render_directory } from "./directory.js";

export async function build_html(scope, opts = {}) {
  const html = `<div class="sg-directories-view">
    <div class="sg-top-bar">
      <p class="sg-context">
        ${scope.items.length} directories
      </p>
      <button class="sg-refresh" aria-label="Refresh view">${this.get_icon_html('refresh-cw')}</button>
      <button class="sg-fold-toggle" aria-label="Toggle expand/collapse all">${this.get_icon_html(scope.env.settings.expanded_view ? 'fold-vertical' : 'unfold-vertical')}</button>
      <button class="sg-help" aria-label="Open help documentation">${this.get_icon_html('help-circle')}</button>
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
    directories.items.map(directory => 
      render_directory.call(this, directory, opts)
    )
  );
  directory_frags.forEach(dir_frag => sg_list.appendChild(dir_frag));

  return await post_process.call(this, directories, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  const container = frag.querySelector('.sg-list');
  
  // Add fold/unfold all functionality
  const toggle_button = frag.querySelector(".sg-fold-toggle");
  toggle_button.addEventListener("click", () => {
    const expanded = scope.env.settings.expanded_view;
    container.querySelectorAll(".directory-item").forEach((elm) => {
      if (expanded) {
        elm.classList.add("sg-collapsed");
      } else {
        elm.classList.remove("sg-collapsed");
      }
    });
    scope.env.settings.expanded_view = !expanded;
    toggle_button.innerHTML = this.get_icon_html(scope.env.settings.expanded_view ? 'fold-vertical' : 'unfold-vertical');
  });

  // Refresh view
  const refresh_button = frag.querySelector(".sg-refresh");
  refresh_button.addEventListener("click", () => {
    if (opts.refresh_view) opts.refresh_view();
  });

  // Help documentation
  const help_button = frag.querySelector(".sg-help");
  help_button.addEventListener("click", () => {
    window.open("https://docs.smartconnections.app/directories", "_blank");
  });

  return frag;
}
