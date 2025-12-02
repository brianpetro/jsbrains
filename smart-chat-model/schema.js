const smart_chat_model_schema = {
  "title": "SmartChatModel",
  "type": "object",
  "description": "Schema for SmartChatModel extending SmartSources",
  "extends": "smart_sources_schema",
  "properties": {
    "platform_key": {
      "type": "string",
      "description": "Key representing the chat platform (e.g., OpenAI, GPT-4)"
    },
    "model_key": {
      "type": "string",
      "description": "Key representing the specific model version"
    },
    "api_key": {
      "type": "string",
      "description": "API key for accessing the platform"
    },
    "endpoint_url": {
      "type": "string",
      "description": "The base URL of the platform API"
    },
    "methods": {
      "type": "object",
      "description": "Methods for SmartChatModel",
      "properties": {
        "init": {
          "description": "Initializes the chat model with the given configuration",
          "type": "function"
        },
        "complete": {
          "description": "Creates a chat completion based on the given request",
          "type": "function"
        },
        "stream": {
          "description": "Creates a streaming chat completion based on the given request",
          "type": "function"
        },
        "stop_stream": {
          "description": "Stops the current streaming chat completion",
          "type": "function"
        },
        "test_api_key": {
          "description": "Tests the validity of the API key",
          "type": "function"
        },
        "count_tokens": {
          "description": "Counts the number of tokens in the given input",
          "type": "function"
        },
        "get_models": {
          "description": "Retrieves available models for the platform",
          "type": "function"
        },
        "get_models_as_options": {
          "description": "Retrieves available models as options for dropdown",
          "type": "function"
        },
        "get_platforms_as_options": {
          "description": "Retrieves available platforms as options for dropdown",
          "type": "function"
        }
      }
    },
    "getters": {
      "type": "object",
      "description": "Getters for SmartChatModel",
      "properties": {
        "adapters": {
          "description": "Returns the adapters for different platforms",
          "type": "function"
        },
        "adapter": {
          "description": "Returns the current adapter for the selected platform",
          "type": "function"
        },
        "http_adapter": {
          "description": "Returns the HTTP adapter for making API requests",
          "type": "function"
        },
        "model_key": {
          "description": "Returns the current model key",
          "type": "function"
        },
        "platform": {
          "description": "Returns the current platform configuration",
          "type": "function"
        },
        "platform_key": {
          "description": "Returns the current platform key",
          "type": "function"
        },
        "settings": {
          "description": "Returns the overall settings for the chat model",
          "type": "function"
        },
        "settings_config": {
          "description": "Returns the configuration for the settings UI",
          "type": "function"
        }
      }
    }
  },
  "required": ["platform_key", "model_key", "api_key", "endpoint_url", "methods", "getters"]
};

const smart_chat_request_schema = {
  "title": "SmartChatRequest",
  "type": "object",
  "description": "Schema for SmartChatRequest",
  "properties": {
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": ["system", "user", "assistant", "function"]
          },
          "content": {
            "type": "string"
          },
          "name": {
            "type": "string",
            "description": "Name of the function, if applicable"
          },
          "tool_calls": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "tool_name": {
                  "type": "string"
                },
                "parameters": {
                  "type": "object"
                }
              },
              "required": ["tool_name", "parameters"]
            }
          },
          "image_url": {
            "type": "string",
            "description": "URL of an image, if applicable"
          }
        },
        "required": ["role", "content"]
      }
    },
    "model": {
      "type": "string",
      "description": "The model identifier to use for this request"
    },
    "temperature": {
      "type": "number",
      "description": "What sampling temperature to use, between 0 and 2",
      "minimum": 0,
      "maximum": 2
    },
    "max_tokens": {
      "type": "integer",
      "description": "The maximum number of tokens to generate in the chat completion"
    },
    "stream": {
      "type": "boolean",
      "description": "Whether to stream back partial progress",
      "default": false
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["function"]
          },
          "function": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "parameters": {
                "type": "object"
              }
            },
            "required": ["name", "description", "parameters"]
          }
        },
        "required": ["type", "function"]
      }
    },
    "tool_choice": {
      "type": ["string", "object"],
      "description": "Controls how the model uses tools",
      "default": "auto"
    }
  },
  "required": ["messages", "model"]
};

const smart_chat_response_schema = {
  "title": "SmartChatResponse",
  "type": "object",
  "description": "Schema for SmartChatResponse",
  "properties": {
    "id": {
      "type": "string"
    },
    "object": {
      "type": "string"
    },
    "created": {
      "type": "number"
    },
    "model": {
      "type": "string"
    },
    "choices": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "index": {
            "type": "number"
          },
          "message": {
            "type": "object",
            "properties": {
              "role": {
                "type": "string",
                "enum": ["assistant", "function"]
              },
              "content": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "tool_calls": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": ["function"]
                    },
                    "function": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string"
                        },
                        "arguments": {
                          "type": "string"
                        }
                      },
                      "required": ["name", "arguments"]
                    }
                  },
                  "required": ["id", "type", "function"]
                }
              }
            },
            "required": ["role", "content"]
          },
          "finish_reason": {
            "type": "string",
            "enum": ["stop", "length", "tool_calls", "content_filter", "function_call"]
          }
        },
        "required": ["index", "message", "finish_reason"]
      }
    },
    "usage": {
      "type": "object",
      "properties": {
        "prompt_tokens": {
          "type": "number"
        },
        "completion_tokens": {
          "type": "number"
        },
        "total_tokens": {
          "type": "number"
        }
      },
      "required": ["prompt_tokens", "completion_tokens", "total_tokens"]
    }
  },
  "required": ["id", "object", "created", "model", "choices", "usage"]
};