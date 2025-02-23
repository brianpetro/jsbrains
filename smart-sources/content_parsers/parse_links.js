import { get_markdown_links } from "../utils/get_markdown_links.js";

export function parse_markdown_links(source, content) {
  if(!source.source_adapter?.get_links) return;
  const outlinks = source.source_adapter.get_links(content);
  source.data.outlinks = outlinks;
}