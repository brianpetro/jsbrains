export function fuzzy_search(arr, search_term) {
  let matches = [];
  // for each element in the array
  for(let i = 0; i < arr.length; i++) {
    // add to matches if the element contains each character of the search term
    const search_chars = search_term.toLowerCase().split('');
    let match = true;
    let distance = 0;
    const name = arr[i];
    const label_name = name.toLowerCase();
    for(let j = 0; j < search_chars.length; j++) {
      // get substring of label name from j
      const search_index = label_name.substring(distance).indexOf(search_chars[j]);
      if(search_index >= 0) {
        distance += search_index + 1;
      } else {
        match = false;
        break;
      }
    }
    if(match) matches.push({name: name, distance: distance});
  }
  // sort matches by distance ASC
  matches.sort((a, b) => a.distance - b.distance);
  // return only label
  return matches.map(match => match.name);
}