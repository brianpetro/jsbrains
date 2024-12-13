import { SmartSource } from "smart-sources";
/**
 * @class SmartTemplate
 * @extends SmartSource
 * @classdesc Represents a single template loaded as a special source. Can generate template outputs via a chat model request.
 *
 * @example
 * const template = env.smart_templates.get('lookup.json');
 * const outputItem = await template.create_output({ query: "Find related notes" });
 */
export class SmartTemplate extends SmartSource {
  /**
   * Performs a semantic lookup using the template options.
   * @async
   * @param {Object} [template_opts={}] - Options for the lookup operation.
   * @returns {Promise<Array>} An array of lookup results derived from the template output.
   *
   * @example
   * const results = await template.lookup({ query: "Find references to topic X" });
   */
  async lookup(template_opts = {}) {
    const output_item = await this.create_output(template_opts);
    const results = await output_item.lookup(template_opts);
    return results;
  }

  /**
   * Creates a new output item by generating a request from template options and completing it.
   * @async
   * @param {Object} [template_opts={}] - Template options for generating the request and producing output.
   * @returns {Promise<SmartTemplateOutput>} The created or updated output item containing the generated response.
   *
   * @example
   * const outputItem = await template.create_output({ query: "Summarize note Y" });
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
   * Converts template options into a chat model request object.
   * @async
   * @param {Object} [template_opts={}] - Template-specific options that influence the request.
   * @returns {Promise<Object>} A request object suitable for the chat model, including messages and tools.
   *
   * @example
   * const req = await template.to_request({ query: "Some prompt" });
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
    };
    return req;
  }

  /**
   * Completes the request using the chat model, handling streaming if supported.
   * @async
   * @param {Object} request - The request object from `to_request()`.
   * @param {Object} [template_opts={}] - Template options used in request completion.
   * @returns {Promise<Object>} The response from the chat model in OpenAI-like format.
   *
   * @example
   * const response = await template.complete_request(request, { query: "Translate this content" });
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
      if (response.error) {
        return this.error_handler(response);
      }
    }
    return response;
  }

  /**
   * Handler for streamed chunks from the chat model (if streaming is used).
   * @param {Object} chunk - Partial response chunk from the model.
   * @private
   */
  chunk_handler(chunk) {
    // Implement custom chunk handling logic if needed
  }

  /**
   * Handler for errors occurring during request completion.
   * @param {Object} errorResponse - The error response returned by the chat model or request logic.
   * @private
   */
  error_handler(errorResponse) {
    console.error("Error during template request:", errorResponse);
    return errorResponse;
  }

  /**
   * Gets the template outputs collection from the environment.
   * @name outputs
   * @type {SmartTemplateOutputs}
   * @readonly
   */
  get outputs() {
    return this.collection.outputs;
  }
}
