export async function parse_metadata(source, content) {
  if(!source.source_adapter?.get_metadata) return;
  const metadata = await source.source_adapter?.get_metadata?.(content);
  source.data.metadata = metadata;
}