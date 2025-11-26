/**
 * chunk_insert.js
 * Inserts large plain-text into a contenteditable element in small bursts so
 * the main thread never blocks for more than a single frame.
 *
 * Pure helpers are exported first for unit testing.
 */
/**
 * Splits text into equally-sized pieces.
 * @param {string} text
 * @param {number} size
 * @returns {string[]}
 */

export function split_into_chunks(text, size = 1024) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}
/**
 * Non-blocking insertion routine.
 * @param {HTMLElement} el – contenteditable target
 * @param {string} text – plain-text payload
 * @param {object} opts
 * @param {number} [opts.chunk_size=1024]
 */

export function insert_text_in_chunks(el, text, opts = {}) {
  const { chunk_size = 1024 } = opts;
  const chunks = split_into_chunks(text, chunk_size);
  if (!chunks.length) return;

  const sel = window.getSelection();
  const base_range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;

  let idx = 0;
  const step = () => {
    const chunk = chunks[idx++];
    if (!chunk) return;

    if (base_range) {
      // Create a temporary container for the nodes
      const temp_container = document.createDocumentFragment();
      text_to_nodes(chunk).forEach(n => temp_container.appendChild(n));
      
      // Insert all nodes at once at the cursor position
      base_range.insertNode(temp_container);
      base_range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(base_range);
    } else {
      // Create a temporary container for the nodes
      const temp_container = document.createDocumentFragment();
      text_to_nodes(chunk).forEach(n => temp_container.appendChild(n));
      
      // Append all nodes at once to the element
      el.appendChild(temp_container);
    }

    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

/**
 * Converts plain text into an array of DOM nodes
 * preserving newline semantics inside contenteditable.
 * @param {string} txt
 * @returns {(Text|HTMLBRElement)[]}
 */
export function text_to_nodes(txt) {
  return txt.split('\n').flatMap((part, i, arr) => {
    const nodes = [document.createTextNode(part)];
    if (i < arr.length - 1) nodes.push(document.createElement('br'));
    return nodes;
  });
}
