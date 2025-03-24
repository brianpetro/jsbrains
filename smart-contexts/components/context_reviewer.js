import context_reviewer_css from './context_reviewer.css' with { type: 'css' };

/**
 * @function build_html
 * @description Builds raw HTML for reviewing a given context's items.
 * @param {Object} context - The SmartContext item instance
 * @param {Object} opts - Optional rendering options
 * @returns {string}
 */
export function build_html(context, opts = {}) {
  if (!context || !context.data) {
    return '<div class="context-review"><p>(No context)</p></div>';
  }
  const context_items = Object.entries(context.data.context_items || {});
  if (!context_items.length) {
    return '<div class="context-review"><p>(No context items)</p></div>';
  }

  const review_html = context_items
    .map(([item_key, item_score]) => {
      // Optional display of numeric score
      const pct =
        typeof item_score === 'number' && item_score < 1
          ? `(${Math.round(item_score * 100)}%) `
          : '';
      return `
        <div class="smart-context-item" data-item-key="${escape_html(item_key)}">
          <button 
            type="button" 
            class="smart-context-remove-btn"
            aria-label="Remove context item"
          >×</button>
          <span class="smart-context-item-content">
            ${pct}
            <a class="internal-link"
               data-href="${escape_html(item_key)}"
               data-path="${escape_html(item_key)}"
               href="#"
            >${item_key}</a>
          </span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="context-review">
      <div class="smart-context-review-file-list">
        ${review_html}
      </div>
    </div>
  `;
}

/**
 * @function render
 * @description Renders the context reviewer. This function builds the raw HTML, creates a
 * DocumentFragment, and calls this file's post_process.
 * @param {Object} context - The SmartContext item instance
 * @param {Object} opts
 * @returns {Promise<DocumentFragment>}
 */
export async function render(context, opts = {}) {
  const html = build_html(context, opts);
  const frag = this.create_doc_fragment(html);
  this.apply_style_sheet(context_reviewer_css);
  post_process.call(this, context, frag, opts);
  return frag;
}

/**
 * @function post_process
 * @description Wires up the minimal logic for removing items from the context and
 * supporting Obsidian internal-link hovers. Does not contain chat-specific logic.
 * @param {Object} context - The SmartContext item instance
 * @param {DocumentFragment} frag
 * @param {Object} opts
 * @returns {DocumentFragment}
 */
export function post_process(context, frag, opts = {}) {
  const env = context?.env;
  const plugin = env?.smart_chat_plugin;
  const container = frag.querySelector('.context-review');
  if (!container) return frag;

  // Handle Obsidian internal links
  const linkEls = container.querySelectorAll('.internal-link');
  linkEls.forEach((linkEl) => {
    linkEl.addEventListener('mouseover', (ev) => {
      plugin?.app?.workspace.trigger('hover-link', {
        event: ev,
        source: 'smart-chat',
        hoverParent: linkEl,
        targetEl: linkEl,
        linktext: linkEl.dataset.href,
      });
    });
    linkEl.addEventListener('dragstart', (ev) => {
      const file_path = linkEl.dataset.href.split('#')[0];
      const file = plugin?.app?.metadataCache?.getFirstLinkpathDest(file_path, '');
      const drag_data = plugin?.app?.dragManager?.dragFile(ev, file);
      plugin?.app?.dragManager?.onDragStart(ev, drag_data);
    });
    linkEl.addEventListener('click', (ev) => {
      ev.preventDefault();
      plugin?.app?.workspace.openLinkText(linkEl.dataset.href, '/', false);
    });
  });

  // Handle "remove" button
  const removeButtons = container.querySelectorAll('.smart-context-remove-btn');
  removeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const parentItem = btn.closest('.smart-context-item');
      if (!parentItem) return;
      const key = parentItem.dataset.itemKey;
      if (key && context.data.context_items[key]) {
        delete context.data.context_items[key];
      }
      parentItem.remove();
    });
  });

  return frag;
}

/**
 * Helper to safely escape HTML entities.
 * @param {string} str
 * @returns {string}
 */
function escape_html(str) {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
    }
    return m;
  });
}
