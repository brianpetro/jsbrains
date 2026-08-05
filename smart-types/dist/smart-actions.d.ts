export type JsonSchemaObject = {
    [x: string]: any;
};
/**
 * @typedef {Object.<string, *>} JsonSchemaObject
 * @property {string} [type] - JSON schema value type.
 * @property {Object.<string, JsonSchemaObject|Object.<string, *>>} [properties] - Object properties keyed by parameter name.
 * @property {string[]} [required] - Required property names.
 * @property {string} [description] - Human-readable schema description.
 * @property {*} [default] - Default value.
 */
export const JsonSchemaObject: {};
export type OpenApiParameter = {
    /**
     * - Parameter name.
     */
    name: string;
    /**
     * - Parameter schema.
     */
    schema?: JsonSchemaObject;
    /**
     * - Whether the parameter is required.
     */
    required?: boolean;
    /**
     * - Parameter description.
     */
    description?: string;
};
/**
 * @typedef {Object} OpenApiParameter
 * @property {string} name - Parameter name.
 * @property {JsonSchemaObject} [schema] - Parameter schema.
 * @property {boolean} [required] - Whether the parameter is required.
 * @property {string} [description] - Parameter description.
 */
export const OpenApiParameter: {};
export type OpenApiRequestBody = {
    /**
     * - Request body content map keyed by MIME type.
     */
    content?: {
        [x: string]: {
            schema?: JsonSchemaObject;
        };
    };
};
/**
 * @typedef {Object} OpenApiRequestBody
 * @property {Object.<string, {schema?: JsonSchemaObject}>} [content] - Request body content map keyed by MIME type.
 */
export const OpenApiRequestBody: {};
export type OpenApiOperation = {
    /**
     * - Stable operation identifier used as the action/tool name.
     */
    operationId?: string;
    /**
     * - Short operation summary.
     */
    summary?: string;
    /**
     * - Operation description.
     */
    description?: string;
    /**
     * - Operation parameters.
     */
    parameters?: OpenApiParameter[];
    /**
     * - Operation request body schema.
     */
    requestBody?: OpenApiRequestBody;
};
/**
 * @typedef {Object} OpenApiOperation
 * @property {string} [operationId] - Stable operation identifier used as the action/tool name.
 * @property {string} [summary] - Short operation summary.
 * @property {string} [description] - Operation description.
 * @property {OpenApiParameter[]} [parameters] - Operation parameters.
 * @property {OpenApiRequestBody} [requestBody] - Operation request body schema.
 */
export const OpenApiOperation: {};
export type OpenApiSpec = {
    /**
     * - OpenAPI paths keyed by route, then method.
     */
    paths?: {
        [x: string]: {
            [x: string]: OpenApiOperation;
        };
    };
};
/**
 * @typedef {Object} OpenApiSpec
 * @property {Object.<string, Object.<string, OpenApiOperation>>} [paths] - OpenAPI paths keyed by route, then method.
 */
export const OpenApiSpec: {};
export type SmartActionToolFunction = {
    /**
     * - Function/tool name.
     */
    name: string;
    /**
     * - Function/tool description.
     */
    description?: string;
    /**
     * - JSON schema-like function parameters.
     */
    parameters?: JsonSchemaObject;
};
/**
 * @typedef {Object} SmartActionToolFunction
 * @property {string} name - Function/tool name.
 * @property {string} [description] - Function/tool description.
 * @property {JsonSchemaObject} [parameters] - JSON schema-like function parameters.
 */
export const SmartActionToolFunction: {};
export type SmartActionToolDefinition = {
    /**
     * - Tool type discriminator.
     */
    type: "function";
    /**
     * - Function metadata.
     */
    function: SmartActionToolFunction;
};
/**
 * @typedef {Object} SmartActionToolDefinition
 * @property {'function'} type - Tool type discriminator.
 * @property {SmartActionToolFunction} function - Function metadata.
 */
export const SmartActionToolDefinition: {};
export type SmartActionDescriptor = {
    /**
     * - Action key.
     */
    key: string;
    /**
     * - Human-readable action description.
     */
    description?: string;
    /**
     * - Instruction text used when presenting the action to a model.
     */
    instruction?: string;
    /**
     * - Input schema for action parameters.
     */
    input_schema: JsonSchemaObject;
    /**
     * - Optional output schema.
     */
    output_schema?: JsonSchemaObject | null;
    /**
     * - Action settings schema.
     */
    settings_config?: import("./smart-environment.js").SettingsConfig;
    /**
     * - MCP or provider-specific descriptor payload.
     */
    descriptor?: {
        [x: string]: any;
    } | null;
    /**
     * - OpenAI-style tool definition.
     */
    tool: SmartActionToolDefinition;
};
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
export const SmartActionDescriptor: {};
export type SmartActionHandler = (params: {
    [x: string]: any;
}) => Promise<any> | any;
export function SmartActionHandler(): void;
export type SmartActionPreProcess = (params: {
    [x: string]: any;
}) => Promise<{
    [x: string]: any;
}> | {
    [x: string]: any;
};
export function SmartActionPreProcess(): void;
export type SmartActionPostProcess = (params: {
    [x: string]: any;
}, result: any) => Promise<any> | any;
export function SmartActionPostProcess(): void;
export type SmartActionModule = {
    [x: string]: any;
};
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
export const SmartActionModule: {};
export type SmartActionData = {
    /**
     * - Stable action key.
     */
    key?: string;
    /**
     * - Adapter/source type used to load the action.
     */
    source_type?: "included" | "mjs" | "cjs" | "api" | string;
    /**
     * - Whether the action is enabled.
     */
    active?: boolean;
    /**
     * - Local module path for file-backed actions.
     */
    file_path?: string;
    /**
     * - Remote endpoint for API-backed actions.
     */
    api_url?: string;
};
/**
 * @typedef {Object} SmartActionData
 * @property {string} [key] - Stable action key.
 * @property {'included'|'mjs'|'cjs'|'api'|string} [source_type] - Adapter/source type used to load the action.
 * @property {boolean} [active] - Whether the action is enabled.
 * @property {string} [file_path] - Local module path for file-backed actions.
 * @property {string} [api_url] - Remote endpoint for API-backed actions.
 */
export const SmartActionData: {};
export type SmartActionAdapterMap = {
    /**
     * - Default action adapter class.
     */
    default?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - Included-module action adapter class.
     */
    included?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - ES module action adapter class.
     */
    mjs?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - CommonJS action adapter class.
     */
    cjs?: import("./smart-environment.js").SmartEnvClass;
    /**
     * - API action adapter class.
     */
    api?: import("./smart-environment.js").SmartEnvClass;
};
/**
 * @typedef {Object} SmartActionAdapterMap
 * @property {import('./smart-environment.js').SmartEnvClass} [default] - Default action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [included] - Included-module action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [mjs] - ES module action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [cjs] - CommonJS action adapter class.
 * @property {import('./smart-environment.js').SmartEnvClass} [api] - API action adapter class.
 */
export const SmartActionAdapterMap: {};
export type SmartActionsOptions = {
    /**
     * - Built-in action modules keyed by action key.
     */
    default_actions?: {
        [x: string]: {
            [x: string]: any;
        };
    };
    /**
     * - Action adapter classes keyed by source type.
     */
    action_adapters?: SmartActionAdapterMap;
};
/**
 * @typedef {Object} SmartActionsOptions
 * @property {Object.<string, SmartActionModule>} [default_actions] - Built-in action modules keyed by action key.
 * @property {SmartActionAdapterMap} [action_adapters] - Action adapter classes keyed by source type.
 */
export const SmartActionsOptions: {};
