import { JsonSingleFileCollectionDataAdapter } from '../../smart-collections/adapters/json_single_file.js';
import { SourceTestAdapter } from 'smart-sources/adapters/_test.js';
import { SmartSources, SmartSource, SmartBlocks, SmartBlock } from 'smart-sources';
import { SmartEnv } from '../../smart-environment/smart_env.js';
import { SmartEmbedModel } from '../../smart-embed-model-v1/smart_embed_model.js';
import { SmartEmbedTransformersAdapter } from '../../smart-embed-model-v1/adapters/transformers.js';
import { SmartEmbedOpenAIAdapter } from '../../smart-embed-model-v1/adapters/openai.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { SmartFsTestAdapter } from '../../smart-fs/adapters/_test.js';
import { SmartChatModel } from '../../smart-chat-model/smart_chat_model.js'; // Import SmartChatModel
import { SmartTemplateEjsAdapter } from '../adapters/ejs.js';
import { SmartTemplateMarkdownAdapter } from '../adapters/markdown.js';
import { SmartTemplates, SmartTemplate } from '../smart_templates.js';

const __dirname = new URL('.', import.meta.url).pathname;

// Mock SmartChatModel
class MockSmartChatModel extends SmartChatModel {
  async complete(request) {
    return {
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  arguments: JSON.stringify({
                    stringVar: 'Alice',
                    numberVar: 10,
                    // booleanVar: true,
                    // arrayVar: ['item1', 'item2'],
                    // objectVar: { key: 'value' },
                    // rawVar: '<Raw Content>',
                    // trimmedVar: 'Trimmed Content',
                    var_1: 'completed 1',
                    var_2: 'completed 2',
                    with_space: 'completed with space',
                    with_hyphen: 'completed with hyphen',
                    var_3: 'completed 3',
                    var_4: 'completed 4',
                    var_5: "completed with 'apostrophes' like this",
                    // var_6: 'manually added 6',
                    // name: 'Alice',
                    // count: 10,
                    // not_a_var: 'not a var',
                    array_var: ['item1', 'item2']
                  })
                }
              }
            ]
          }
        }
      ]
    };
  }
}

class TestMain {
  load_settings() { return {}; }
  save_settings() {}
  get settings() { return {}; }
  get smart_env_config() {
    return {
      env_path: __dirname,
      env_data_dir: 'test',
      modules: {
        // smart_embed_model: {
        //   class: SmartEmbedModel,
        //   adapters: {
        //     transformers: SmartEmbedTransformersAdapter,
        //     openai: SmartEmbedOpenAIAdapter,
        //   },
        // },
        smart_fs: {
          class: SmartFs,
          adapter: SmartFsTestAdapter,
        },
        smart_chat_model: {
          class: MockSmartChatModel, // Use the mocked SmartChatModel
          adapters: {}, // Add any necessary adapters if required
          http_adapter: {}, // Mocked or empty as needed
        },
      },
      collections: {
        // smart_sources: {
        //   class: SmartSources,
        //   data_adapter: JsonSingleFileCollectionDataAdapter,
        //   source_adapters: {
        //     test: SourceTestAdapter,
        //     md: SourceTestAdapter,
        //     default: SourceTestAdapter
        //   },
        // },
        // smart_blocks: SmartBlocks,
        smart_templates: { // Include smart_templates collection
          class: SmartTemplates, // Ensure SmartTemplates is imported
          data_adapter: JsonSingleFileCollectionDataAdapter, // Use appropriate data adapter
          template_adapters: {
            ejs: SmartTemplateEjsAdapter,
            md: SmartTemplateMarkdownAdapter,
          },
          source_adapters: {
            test: SourceTestAdapter,
            md: SourceTestAdapter,
            default: SourceTestAdapter
          },
        },
      },
      item_types: {
        SmartSource,
        SmartBlock,
        SmartTemplate, // Ensure SmartTemplate is imported
      },
    };
  }
}

export async function load_test_env(t) {
  const main = new TestMain();
  const env = await SmartEnv.create(main, main.smart_env_config);
  
  // Initialize smart_settings with var_prompts and other necessary settings
  env.smart_settings._settings = {
    smart_templates: {
      var_prompts: {
        stringVar: { prompt: 'String Variable Prompt' },
        numberVar: { prompt: 'Number Variable Prompt' },
        booleanVar: { prompt: 'Boolean Variable Prompt' },
        arrayVar: { prompt: 'Array Variable Prompt' },
        objectVar: { prompt: 'Object Variable Prompt' },
        rawVar: { prompt: 'Raw Variable Prompt' },
        trimmedVar: { prompt: 'Trimmed Variable Prompt' },
        name: { prompt: 'name prompt' }, // Added
        count: { prompt: 'count prompt' }, // Added
        // with_space: { prompt: 'with space prompt' }, // Added
        // with_hyphen: { prompt: 'with hyphen prompt' }, // Added
        // not_a_var: { prompt: 'not_a_var prompt' }, // Added
        // another_not_a_var: { prompt: 'another_not_a_var prompt' }, // Added
      },
      chat_model_platform_key: 'openai',
      max_content_length: 10000,
      templates_folder: '', // Logical folder name
    },
  };
  
  t.context.env = env;
  t.context.fs = env.smart_templates.fs;
}
