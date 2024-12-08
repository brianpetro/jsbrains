import { SmartSource } from "smart-sources";

export class SmartTemplate extends SmartSource {
  get outputs() {
    return this.collection.outputs;
  }
  async create_output(template_opts = {}) {
    const request = await this.to_request(template_opts);
    const response = await this.complete_request(request, template_opts);
    const output_item = await this.outputs.create_or_update(response);
    return output_item;
  }
  async to_request(template_opts = {}) {
    const req = {
      messages: [],
      tools: [this.data.tool],
      tool_choice: {
        type: 'function',
        function: {
          name: this.data.name,
        }
      }
    }
    return req;
  }
  async complete_request(request, template_opts = {}) {
    let response;
    if (this.chat_model.can_stream) {
      response = await this.chat_model.stream(request, {
        chunk: this.chunk_handler.bind(this),
        error: this.error_handler.bind(this),
      });

    } else {
      response = await this.chat_model.complete(request);
      if(response.error){
        return this.error_handler(response);
      }
    }
    return response;
  } 
}