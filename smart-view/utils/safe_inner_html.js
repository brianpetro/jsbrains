/**
 * Public façade: hot-swap an element’s children with `html_snippet`,
 * selecting the fastest safe parser for the snippet at runtime.
 *
 * – template cache for generic markup
 * – createContextualFragment when element context is required
 *
 * @module safe_inner_html
 * @param {HTMLElement} container
 * @param {string}      html_snippet
 * @returns {void}
 */
import { replace_html }          from './replace_html.js';
import { replace_with_fragment } from './replace_with_fragment.js';

const restricted_re =
  /<(td|th|tr|thead|tbody|tfoot|caption|col|colgroup|option|optgroup|li|dt|dd|source|track)\b/i;

export const safe_inner_html = (container, html_snippet) => {
  const trimmed = html_snippet.trim();
  (restricted_re.test(trimmed) ? replace_with_fragment : replace_html)(container, trimmed);
};
