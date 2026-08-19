/**
 * @typedef {Object.<string, unknown>} JsonSchemaObject
 * @property {string} [type] - JSON schema value type.
 * @property {Object.<string, JsonSchemaObject|Object.<string, unknown>>} [properties] - Object properties keyed by parameter name.
 * @property {string[]} [required] - Required property names.
 * @property {string} [description] - Human-readable schema description.
 * @property {unknown} [default] - Default value.
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
 * @description Legacy provider-shaped tool definition.
 */
export const SmartActionToolDefinition = {};

/**
 * @typedef {Object} SmartActionToolEffects
 * @property {boolean} [read_only] - Whether the tool only reads state.
 * @property {boolean} [destructive] - Whether the tool may destroy data.
 * @property {boolean} [idempotent] - Whether repeated calls have the same effect.
 * @property {boolean} [open_world] - Whether the tool may interact beyond the environment.
 */
export const SmartActionToolEffects = {};

/**
 * @typedef {Object} SmartActionToolWhenContext
 * @property {import('./smart-environment.js').SmartEnv} env - Active Smart Environment.
 * @property {string} action_key - Configured action key.
 * @property {Object.<string, unknown>} action_entry - Final configured action entry.
 */
export const SmartActionToolWhenContext = {};

/**
 * @callback SmartActionToolWhen
 * @param {SmartActionToolWhenContext} context - Tool discovery context.
 * @returns {boolean} Whether the tool is currently available.
 */
export const SmartActionToolWhen = function () {};

/**
 * @typedef {Object} SmartActionToolRequestProjectionContext
 * @property {import('./smart-environment.js').SmartEnv} env - Active Smart Environment.
 */
export const SmartActionToolRequestProjectionContext = {};

/**
 * @typedef {Object} SmartActionToolProjectedRequest
 * @property {object} scope - Exact natural action scope.
 * @property {Object.<string, unknown>} params - Natural parameters passed to the action.
 */
export const SmartActionToolProjectedRequest = {};

/**
 * @callback SmartActionToolProjectRequest
 * @param {Object.<string, unknown>} request - Validated public tool request.
 * @param {SmartActionToolRequestProjectionContext} context - Tool request projection context.
 * @returns {Promise<SmartActionToolProjectedRequest>|SmartActionToolProjectedRequest} Natural invocation inputs.
 */
export const SmartActionToolProjectRequest = function () {};

/**
 * @typedef {Object} SmartActionToolProjectionContext
 * @property {import('./smart-environment.js').SmartEnv} env - Active Smart Environment.
 * @property {object} scope - Resolved natural action scope.
 * @property {Object.<string, unknown>} params - Validated natural action params.
 */
export const SmartActionToolProjectionContext = {};

/**
 * @callback SmartActionToolProjectResult
 * @param {unknown} raw_result - Natural result returned by the action.
 * @param {SmartActionToolProjectionContext} context - Tool invocation context.
 * @returns {Promise<unknown>|unknown} JSON-safe public tool result.
 */
export const SmartActionToolProjectResult = function () {};

/**
 * @typedef {Object} SmartActionToolDescriptor
 * @property {string} name - Stable public tool name.
 * @property {SmartActionToolWhen} [when] - Optional capability predicate.
 * @property {SmartActionToolEffects} [effects] - Optional public effect hints.
 * @property {SmartActionToolProjectRequest} [project_request] - Optional public-to-natural request projection.
 * @property {JsonSchemaObject} [input_schema] - Optional public-request schema; valid only when project_request is present.
 * @property {SmartActionToolProjectResult} [project_result] - Optional natural-to-public result projection.
 * @property {JsonSchemaObject} [output_schema] - Optional projected-result schema; valid only when project_result is present.
 */
export const SmartActionToolDescriptor = {};

/**
 * @typedef {Object} SmartActionDescriptor
 * @property {string} key - Action key.
 * @property {string} [description] - Human-readable action description.
 * @property {string} [instruction] - Instruction text used when presenting the action to a model.
 * @property {JsonSchemaObject} input_schema - Input schema for natural action parameters.
 * @property {JsonSchemaObject|null} [output_schema] - Optional direct action-result schema; null clears an inherited schema.
 * @property {import('./smart-environment.js').SettingsConfig} [settings_config] - Action settings schema.
 * @property {Object.<string, unknown>|null} [descriptor] - MCP or provider-specific descriptor payload.
 * @property {SmartActionToolDescriptor|SmartActionToolDefinition|false|null} [tool] - Canonical or legacy tool definition.
 */
export const SmartActionDescriptor = {};

/**
 * @callback SmartActionHandler
 * @param {Object.<string, unknown>} params - Action parameters.
 * @returns {Promise<unknown>|unknown} Action result.
 */
export const SmartActionHandler = function () {};

/**
 * @callback SmartActionPreProcess
 * @param {Object.<string, unknown>} params - Incoming action parameters.
 * @returns {Promise<Object.<string, unknown>>|Object.<string, unknown>} Processed parameters.
 */
export const SmartActionPreProcess = function () {};

/**
 * @callback SmartActionPostProcess
 * @param {Object.<string, unknown>} params - Parameters used to run the action.
 * @param {unknown} result - Raw action result.
 * @returns {Promise<unknown>|unknown} Processed action result.
 */
export const SmartActionPostProcess = function () {};

/**
 * @typedef {Object.<string, unknown>} SmartActionModule
 * @property {SmartActionHandler} [default] - Default callable export for the action.
 * @property {string} [description] - Human-readable action description.
 * @property {string} [instruction] - Instruction text used when presenting the action to a model.
 * @property {JsonSchemaObject} [input_schema] - Input schema for natural action parameters.
 * @property {JsonSchemaObject|null} [output_schema] - Optional direct action-result schema; null clears an inherited schema.
 * @property {import('./smart-environment.js').SettingsConfig} [settings_config] - Action settings schema.
 * @property {OpenApiSpec} [openapi] - OpenAPI spec used to derive tool parameters.
 * @property {SmartActionToolDescriptor|SmartActionToolDefinition|false|null} [tool] - Canonical or legacy tool definition.
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
