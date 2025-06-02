/**
 * Lightweight pluralisation helper covering the common words used by Smart‑* collections.
 * - entity → entities
 * - context → contexts
 * - action → actions
 * Leaves words already ending in "s" unchanged.
 * @param {string} word
 * @returns {string}
 */
export function pluralize(word) {
  if (/[^aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + "ies"; // party → parties
  }
  if (word.endsWith("s")) return word; // already plural
  return word + "s"; // default rule ⇒ add "s"
}