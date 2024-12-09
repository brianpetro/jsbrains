import { SmartSource } from "smart-sources";

/**
 * @class SmartTemplate
 * @extends SmartSource
 * @description A class that handles smart template operations including output generation and request handling.
 */
export class SmartTemplate extends SmartSource {
  /**
   * @returns {SmartTemplateOutputs} The collection of template outputs
   */
  get outputs() {
    return this.collection.outputs;
  }

  /**
   * @async
   * @param {Object} template_opts - Template options for lookup
   * @returns {Promise<Array>} Results from the template lookup
   * @description Performs a lookup operation using the template options
   */
  async lookup(template_opts = {}) {
    const output_item = await this.create_output(template_opts);
    const results = await output_item.lookup(template_opts);
    return results;
  }

  /**
   * @async
   * @param {Object} template_opts - Template options for output creation
   * @returns {Promise<SmartTemplateOutput>} Created or updated output item
   * @description Creates a new output item based on template options
   */
  async create_output(template_opts = {}) {
    const request = await this.to_request(template_opts);
    const response = await this.complete_request(request, template_opts);
    const output_item = await this.outputs.create_or_update({
      template_key: this.key,
      response,
      template_opts
    });
    return output_item;
  }

  /**
   * @async
   * @param {Object} template_opts - Template options for request generation
   * @returns {Promise<Object>} Generated request object with messages and tools
   * @description Converts template options into a request object
   */
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

  /**
   * @async
   * @param {Object} request - Request object to be completed
   * @param {Object} template_opts - Template options for request completion
   * @returns {Promise<Object>} Completed response from the chat model
   * @description Completes a request using either streaming or non-streaming chat model
   */
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
