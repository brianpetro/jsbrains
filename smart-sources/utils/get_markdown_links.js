/**
 * Extracts all wiki‑links and standard markdown links from a text
 * buffer and returns a stable, line‑sorted array of
 * `{ title, target, line }` records.
 *
 * ‑ For *local* links (those **not** beginning with a URI scheme) any
 *   URL‑escaped sequences such as “%20” are automatically decoded so
 *   that downstream code always receives plain‑text paths
 *   (e.g. “Some File.md” rather than “Some%20File.md”).
 * ‑ External URLs (http, https, obsidian, etc.) are **left untouched**;
 *   decoding them would change their semantic meaning.
 *
 * @param {string} content
 * @returns {Array<{ title:string, target:string, line:number }>}
 */
export function get_markdown_links(content) {
  /** @type {Array<{ title:string, target:string, line:number }>} */
  const result = [];

  const markdown_link_re = /\[([^\]]+?)\]\(([^)]+?)\)/g;                    // [txt](path)
  const wikilink_re      = /\[\[([^\|\]]+?)(?:\|([^\]]+?))?\]\]/g;           // [[path|txt]]

  /**
   * Decodes "%xx" sequences for vault‑relative paths while leaving
   * remote URLs intact.  `decodeURIComponent` is wrapped in try/catch
   * so that malformed escape sequences never crash the scan.
   *
   * @param {string} raw
   * @returns {string}
   */
  const normalise_target = (raw) => {
    const trimmed = raw.trim();

    // If it *looks* like a URL with scheme, bail out early.
    if (/^[a-zA-Z][\w+\-.]*:\/\//.test(trimmed)) return trimmed;

    try {
      return decodeURIComponent(trimmed);
    } catch (_) {
      // Fallback: only unescape "%20" (space) – safest common case.
      return trimmed.replace(/%20/gi, ' ');
    }
  };

  /* ─────────────────────── Standard MD links ────────────────────── */
  let m;
  while ((m = markdown_link_re.exec(content)) !== null) {
    const title   = m[1];
    const target  = normalise_target(m[2]);
    const line_no = content.slice(0, m.index).split('\n').length;

    result.push({ title, target, line: line_no });
  }

  /* ────────────────────────── Wiki‑links ────────────────────────── */
  while ((m = wikilink_re.exec(content)) !== null) {
    const target_raw = m[1];
    const title      = m[2] || target_raw;
    const target     = normalise_target(target_raw);
    const line_no    = content.slice(0, m.index).split('\n').length;

    result.push({ title, target, line: line_no });
  }

  /* ───────────────────────── Canonical sort ─────────────────────── */
  return result.sort(
    (a, b) => (a.line - b.line) || a.target.localeCompare(b.target)
  );
}
