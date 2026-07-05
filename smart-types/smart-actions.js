/**
 * @typedef {Object.<string, *>} JsonSchemaObject
 * @property {string} [type] - JSON schema value type.
 * @property {Object.<string, JsonSchemaObject|Object.<string, *>>} [properties] - Object properties keyed by parameter name.
 * @property {string[]} [required] - Required property names.
 * @property {string} [description] - Human-readable schema description.
 * @property {*} [default] - Default value.
 */
export const JsonSchemaObject = {};

/**
 * @typedef {Object} OpenApiParameter
 * @property {string} name - Parameter name.
 * @property {JsonSchemaObject} [schema] - Parameter schema.
 * @property {boolean} [required] - Whether the parameter is required.
 * @property {string} [description] - Parameter description.
 */
export const OpenApiParameter = {};

/**
 * @typedef {Object} OpenApiRequestBody
 * @property {Object.<string, {schema?: JsonSchemaObject}>} [content] - Request body content map keyed by MIME type.
 */
export const OpenApiRequestBody = {};

/**
 * @typedef {Object} OpenApiOperation
 * @property {string} [operationId] - Stable operation identifier used as the action/tool name.
 * @property {string} [summary] - Short operation summary.
 * @property {string} [description] - Operation description.
 * @property {OpenApiParameter[]} [parameters] - Operation parameters.
 * @property {OpenApiRequestBody} [requestBody] - Operation request body schema.
 */
export const OpenApiOperation = {};

/**
 * @typedef {Object} OpenApiSpec
 * @property {Object.<string, Object.<string, OpenApiOperation>>} [paths] - OpenAPI paths keyed by route, then method.
 */
export const OpenApiSpec = {};

/**
 * @typedef {Object} SmartActionToolFunction
 * @property {string} name - Function/tool name.
 * @property {string} [description] - Function/tool description.
 * @property {JsonSchemaObject} [parameters] - JSON schema-like function parameters.
 */
export const SmartActionToolFunction = {};

/**
 * @typedef {Object} SmartActionToolDefinition
 * @property {'function'} type - Tool type discriminator.
 * @property {SmartActionToolFunction} function - Function metadata.
 */
export const SmartActionToolDefinition = {};

/**
 * @typedef {Object} SmartActionDescriptor
 * @property {string} key - Action key.
 * @property {string} [description] - Human-readable action description.
 * @property {string} [instruction] - Instruction text used when presenting the action to a model.
 * @property {JsonSchemaObject} input_schema - Input schema for action parameters.
 * @property {JsonSchemaObject|null} [output_schema] - Optional output schema.
 * @property {import('./smart-environment.js').SettingsConfig} [settings_config] - Action settings schema.
 * @property {Object.<string, *>|null} [descriptor] - MCP or provider-specific descriptor payload.
 * @property {SmartActionToolDefinition} tool - OpenAI-style tool definition.
 */
export const SmartActionDescriptor = {};

/**
 * @callback SmartActionHandler
 * @param {Object.<string, *>} params - Action parameters.
 * @returns {Promise<*>|*} Action result.
 */
export const SmartActionHandler = function () {};

/**
 * @callback SmartActionPreProcess
 * @param {Object.<string, *>} params - Incoming action parameters.
 * @returns {Promise<Object.<string, *>>|Object.<string, *>} Processed parameters.
 */
export const SmartActionPreProcess = function () {};

/**
 * @callback SmartActionPostProcess
 * @param {Object.<string, *>} params - Parameters used to run the action.
 * @param {*} result - Raw action result.
 * @returns {Promise<*>|*} Processed action result.
 */
export const SmartActionPostProcess = function () {};

/**
 * @typedef {Object.<string, *>} SmartActionModule
 * @property {SmartActionHandler} [default] - Default callable export for the action.
 * @property {string} [description] - Human-readable action description.
 * @property {string} [instruction] - Instruction text used when presenting the action to a model.
 * @property {JsonSchemaObject} [input_schema] - Input schema for action parameters.
 * @property {JsonSchemaObject} [output_schema] - Optional output schema.
 * @property {import('./smart-environment.js').SettingsConfig} [settings_config] - Action settings schema.
 * @property {OpenApiSpec} [openapi] - OpenAPI spec used to derive tool parameters.
 * @property {SmartActionToolDefinition} [tool] - Explicit OpenAI-style tool definition.
 * @property {Object.<string, SmartActionPreProcess>} [pre_processes] - Parameter pre-processors.
 * @property {Object.<string, SmartActionPostProcess>} [post_processes] - Result post-processors.
 */
export const SmartActionModule = {};

/**
 * @typedef {Object} SmartActionData
 * @property {string} [key] - Stable action key.
 * @property {'included'|'mjs'|'cjs'|'api'|string} [source_type] - Adapter/source type used to load the action.
 * @property {boolean} [active] - Whether the action is enabled.
 * @property {string} [file_path] - Local module path for file-backed actions.
 * @property {string} [api_url] - Remote endpoint for API-backed actions.
 */
export const SmartActionData = {};

/**
 * @typedef {Object} SmartActionAdapterMap
 * @property {import('./smart-environment.js').SmartEnvClass} [default] - Default action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [included] - Included-module action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [mjs] - ES module action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [cjs] - CommonJS action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [api] - API action adapter class.
 */
export const SmartActionAdapterMap = {};

/**
 * @typedef {Object} SmartActionsOptions
 * @property {Object.<string, SmartActionModule>} [default_actions] - Built-in action modules keyed by action key.
 * @property {SmartActionAdapterMap} [action_adapters] - Action adapter classes keyed by source type.
 */
export const SmartActionsOptions = {};
