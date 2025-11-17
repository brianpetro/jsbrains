import { SmartCompletionAdapter } from './_adapter.js';

/**
 * @class ActionCompletionAdapter
 * @extends SmartCompletionAdapter
 * @deprecated Use SmartActionToolCompletionAdapter instead.
 *
 * This adapter checks `item.data.action` as a single SmartAction key,
 * compiles ephemeral action text, and inserts it as a system message.
 * Then, after response, if the assistant includes `tool_call` in `this.response`,
 * it calls the corresponding `action_item.run(args)` and stores the result in
 * `this.data.actions[action_key]`.
 */
export class ActionCompletionAdapter extends SmartCompletionAdapter {
  static get property_name() {
    return 'action_key';
  }

  /**
   * @returns {Promise<void>}
   */
  async to_request() {
    const action_key = this.data.action_key;
    if (!action_key) return;

    const thread = this.item.thread;
    if (thread && thread.current_completion !== this.item) return console.log('ActionCompletionAdapter: skipping tools, not the current completion');

    const action_opts = this.data.action_opts;

    // Single context item only:
    const action_collection = this.item.env.smart_actions;
    if (!action_collection) {
      console.warn("No 'smart_actions' collection found; skipping action adapter.");
      return;
    }
    const action_item = action_collection.get(action_key);
    if (!action_item) {
      console.warn(`SmartAction not found for key '${action_key}'`);
      return;
    }

    let tools;
    try {
      const tool = action_item.as_tool;
      tools = tool ? [tool] : [];
    } catch (err) {
      console.warn('Error generating action tool', err);
      return;
    }

    if (!tools.length) return;

    // Mark that this action is being requested (before completion)
    if (!this.data.actions) this.data.actions = {};
    this.data.actions[action_key] = true;

    this.insert_tools(tools, { force: true });
  }

  get default_action_params() {
    return this.data.action_opts || {};
  }

  /**
   * @returns {Promise<void>}
   */
  async from_response() {
    console.log('ActionCompletionAdapter: from_response');

    const tool_call = this.response.choices[0].message?.tool_calls?.[0];
    if (!tool_call) return console.warn('No tool call found in response');
    const action_key = tool_call?.function?.name;
    const tool_arguments = tool_call?.function?.arguments;
    if (!action_key) return;

    // Use the same collection from env
    const action_collection = this.item.env.smart_actions;
    if (!action_collection) return;

    const action_item = action_collection.get(action_key);
    if (!action_item) return;

    // Attempt to parse arguments if it's a string
    let parsed_args = tool_arguments;
    if (typeof parsed_args === 'string') {
      try {
        parsed_args = JSON.parse(parsed_args);
      } catch (err) {
        console.warn('Could not parse tool_call arguments', err);
        return;
      }
    }

    // Run the action
    const action_params = {
      ...this.default_action_params,
      ...parsed_args,
    }
    const result = await action_item.run_action(action_params);
    // If the tool returns an object with a 'final' key, treat it as the final assistant message
    if (result && typeof result === 'object' && result.final) {
      // Ensure we have a response object in completion
      if (!this.item.data.completion.responses[0]) {
        this.item.data.completion.responses[0] = { choices: [ { message: {} } ] };
      } else if (!this.item.data.completion.responses[0].choices?.[0]) {
        this.item.data.completion.responses[0].choices = [ { message: {} } ];
      }

      // Write final as the assistant's content
      this.item.data.completion.responses[0].choices[0].message = {
        ...this.item.data.completion.responses[0].choices[0].message,
        role: "assistant",
        content: result.final
      };
    }

    // Store the result in `this.data.actions` under the same action key
    if (!this.data.actions) this.data.actions = {};
    this.data.actions[action_key] = result;
  }

  /**
   * Insert the ephemeral tools into the request
   * @param {Array<object>} tools
   * @param {object} opts
   * @returns {void}
   */
  insert_tools(tools, opts = {}) {
    this.request.tools = tools;
    if (opts.force) {
      this.request.tool_choice = {
        type: 'function',
        function: {
          name: tools[0].function.name
        }
      };
    }
  }
}

/**
 * Converts OpenAPI specification into OpenAI's tool_call format
 * @param {object} openapi_spec - Parsed OpenAPI JSON specification
 * @returns {Array<object>} Array of tool_call formatted objects
 */
export function convert_openapi_to_tools(openapi_spec) {
  const tools = [];

  for (const path in openapi_spec.paths) {
    const methods = openapi_spec.paths[path];

    for (const method in methods) {
      const endpoint = methods[method];

      const parameters = endpoint.parameters || [];
      const requestBody = endpoint.requestBody;

      const properties = {};
      const required = [];

      parameters.forEach(param => {
        properties[param.name] = {
          type: param.schema.type,
          description: param.description || ''
        };
        if (param.required) required.push(param.name);
      });

      if (requestBody) {
        const schema = requestBody.content['application/json'].schema;
        Object.assign(properties, schema.properties);
        if (schema.required) required.push(...schema.required);
      }

      tools.push({
        type: 'function',
        function: {
          name: endpoint.operationId || `${method}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`,
          description: endpoint.summary || endpoint.description || '',
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      });
    }
  }

  return tools;
}
