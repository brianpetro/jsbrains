export function empty(elm) {
  const range = document.createRange();
  range.selectNodeContents(elm);
  range.deleteContents();
}