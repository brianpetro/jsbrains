import { SmartSource } from '../SmartSource.js';
import { SmartSources } from '../SmartSources.js';
import { SmartBlock } from '../SmartBlock.js';
import { SmartBlocks } from '../SmartBlocks.js';
import { SmartChunks } from '../../smart-chunks/smart_chunks.js';
export function load_test_env(t) {
  t.context.mock_env = {
    item_types: {
      SmartSource: SmartSource,
      SmartBlock: SmartBlock,
    },
    fs: {
      write: async (key, content) => {
        t.context.mock_env.files[key] = content;
      },
      append: async (key, content) => {
        t.context.mock_env.files[key] += content;
      },
      read: async (key) => {
        return t.context.mock_env.files[key];
      },
      remove: async (key) => {
        delete t.context.mock_env.files[key];
      },
      exists: async (key) => {
        const entity = key.includes("#") ? t.context.mock_env.smart_blocks.get(key) : t.context.mock_env.smart_sources.get(key);
        if(entity?.deleted) return false;
        return key in t.context.mock_env.files;
      },
      rename: async (old_key, new_key) => {
        t.context.mock_env.files[new_key] = `${t.context.mock_env.files[old_key]}`;
        delete t.context.mock_env.files[old_key];
      }
    },
    files: {},
    main: {
      read_file: async (path) => {
        return t.context.mock_env.files[path];
      },
      get_tfile: (path) => {
        return { stat: { mtime: Date.now(), size: 33 }, extension: 'md' };
      },
      get_link_target_path: (target, file_path) => {
        return target;
      },
      open_note: (path) => {
        console.log(`Opening note: ${path}`);
      },
      notices: {
        show: (id, messages, opts) => {
          console.log(`Notice [${id}]: ${messages.join(' ')}`);
        },
        remove: (id) => {
          console.log(`Notice [${id}] removed`);
        }
      }
    },
    links: {},
    save: () => {
      console.log('Environment saved');
    },
    is_included: (path) => {
      return true;
    },
    settings: {}
  };
  t.context.mock_env.smart_chunks = new SmartChunks(t.context.mock_env);
  t.context.mock_env.smart_blocks = new SmartBlocks(t.context.mock_env);
  t.context.mock_env.smart_sources = new SmartSources(t.context.mock_env);
}