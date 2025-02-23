export function parse_metadata(source, content) {
  if(!source.source_adapter?.get_metadata) return;
  const {frontmatter} = source.source_adapter?.get_metadata?.(content);
  source.data.metadata = frontmatter;
}