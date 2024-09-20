export function parse_blocks(source) {
  const {blocks, ...rest} = source.smart_chunks.parse(source);
  source.collection.create_blocks(source, blocks);
}