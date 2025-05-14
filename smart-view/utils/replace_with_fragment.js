/**
 * Replace `container` children with a context-aware fragment.
 * Use when `html_snippet` has context-sensitive tags such as <li>, <td>, etc.
 *
 * @module replace_with_fragment
 * @param {HTMLElement} container
 * @param {string}      html_snippet
 * @returns {void}
 */
export const replace_with_fragment = (container, html_snippet) => {
  const range = document.createRange();
  const frag  = range.createContextualFragment(html_snippet.trim());
  container.replaceChildren(frag);
};
