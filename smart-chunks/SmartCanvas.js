
    // if(curr_file.extension === "canvas") {
    //   // get file contents and parse as JSON
    //   const canvas_contents = await this.app.vault.cachedRead(curr_file);
    //   if((typeof canvas_contents === "string") && (canvas_contents.indexOf("nodes") > -1)) {
    //     const canvas_json = JSON.parse(canvas_contents);
    //     // for each object in nodes array
    //     for(let j = 0; j < canvas_json.nodes.length; j++) {
    //       // if object has text property
    //       if(canvas_json.nodes[j].text) {
    //         // add to file_embed_input
    //         file_embed_input += "\n" + canvas_json.nodes[j].text;
    //       }
    //       // if object has file property
    //       if(canvas_json.nodes[j].file) {
    //         // add to file_embed_input
    //         file_embed_input += "\nLink: " + canvas_json.nodes[j].file;
    //       }
    //     }
    //   }
    // }