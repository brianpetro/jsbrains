// /**
//  * Builds the HTML string for the result component.
//  * .temp-container is used so listeners can be added to .sc-result (otherwise does not persist) 
//  * @param {Object} result - The results a <Result> object 
//  * @param {Object} [opts={}] - Optional parameters.
//  * @returns {Promise<string>} A promise that resolves to the HTML string.
//  */
// export async function build_html(result, opts = {}) {
//   const item = result.item;
//   const score = result.score; // Extract score from opts
//   const expanded_view = item.env.settings.smart_view_filter.expanded_view
//     ?? item.env.settings.expanded_view // @deprecated
//   ;
  
//   return `<div class="temp-container">
//     <div
//       class="sc-result${expanded_view ? '' : ' sc-collapsed'}"
//       data-path="${item.path.replace(/"/g, '&quot;')}"
//       data-link="${item.link?.replace(/"/g, '&quot;') || ''}"
//       data-collection="${item.collection_key}"
//       data-score="${score}"
//       draggable="true"
//     >
//       <span class="header">
//         ${this.get_icon_html('right-triangle')}
//         <a class="sc-result-file-title" href="#" title="${item.path.replace(/"/g, '&quot;')}" draggable="true">
//           <small>${[score?.toFixed(2), item.name].join(' | ')}</small>
//         </a>
//       </span>
//       <ul draggable="true">
//         <li class="sc-result-file-title" title="${item.path.replace(/"/g, '&quot;')}" data-collection="${item.collection_key}" data-key="${item.key}"></li>
//       </ul>
//     </div>
//   </div>`;
// }

// /**
//  * Renders the result component by building the HTML and post-processing it.
//  * @param {Object} result - The result object containing component data.
//  * @param {Object} [opts={}] - Optional parameters.
//  * @returns {Promise<DocumentFragment>} A promise that resolves to the processed document fragment.
//  */
// export async function render(result, opts = {}) {
//   let html = await build_html.call(this, result, opts);
//   const frag = this.create_doc_fragment(html);
//   return await post_process.call(this, result, frag, opts);
// }

// /**
//  * Post-processes the rendered document fragment by adding event listeners and rendering entity details.
//  * @param {DocumentFragment} frag - The document fragment to be post-processed.
//  * @param {Object} [opts={}] - Optional parameters.
//  * @returns {Promise<DocumentFragment>} A promise that resolves to the post-processed document fragment.
//  */
// export async function post_process(result, frag, opts = {}) {
//   const search_result = frag.querySelector('.sc-result');
//   const filter_settings = result.item.env.settings.smart_view_filter;
//   if(!filter_settings.render_markdown) search_result.classList.add('sc-result-plaintext');
  
//   // Add event listeners specific to the search result
//   if(typeof opts.add_result_listeners === 'function') opts.add_result_listeners(search_result);
  
//   if(!filter_settings.expanded_view) return search_result;
//   // Render entity details
//   const li = search_result.querySelector('li');
//   const entity = result.item;
//   if (entity) {
//     await entity.render_item(li, opts);
//   } else {
//     this.safe_inner_html(li, "<p>Entity not found.</p>");
//   }

//   return search_result;
// }