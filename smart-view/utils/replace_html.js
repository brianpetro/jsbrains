/**
 * Replace all child nodes of `container` with a cached clone of `html_snippet`.
 * Optimised for repeated renders of identical markup.
 *
 * @module replace_html
 * @param {HTMLElement} container
 * @param {string}      html_snippet
 * @returns {void}
 */
export const replace_html = (() => {
  const cache = new Map();
  return (container, html_snippet) => {
    const key = html_snippet.trim();
    let tpl = cache.get(key);
    if (!tpl) {
      tpl = document.createElement('template');
      tpl.innerHTML = key;
      cache.set(key, tpl);
    }
    container.replaceChildren(tpl.content.cloneNode(true));
  };
})();
