// check if contains internal link
export function contains_internal_link(user_input) {
  if (user_input.indexOf("[[") === -1) return false;
  if (user_input.indexOf("]]") === -1) return false;
  return true;
}

export function extract_internal_links(env, user_input) {
  const matches = user_input.match(/\[\[(.*?)\]\]/g);
  // return array of TFile objects
  if (matches && env.smart_connections_plugin) return matches.map(match => {
    const tfile = env.smart_connections_plugin.app.metadataCache.getFirstLinkpathDest(match.replace("[[", "").replace("]]", ""), "/");
    return tfile;
  });
  if (matches) return matches;
  return [];
}