export function parse_links(source, content) {
  if(!source.source_adapter?.get_links) return;
  const outlinks = source.source_adapter.get_links(content);
  source.data.outlinks = outlinks;
}