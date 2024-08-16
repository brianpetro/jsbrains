import { SmartSource } from '../smart_source.js';
import { SmartSources } from '../smart_sources.js';
import { SmartBlock } from '../smart_block.js';
import { SmartBlocks } from '../smart_blocks.js';
import { SmartChunks } from '../../smart-chunks/smart_chunks.js';
import { SmartFs } from '../../smart-fs/smart_fs.js';
import { TestFsSmartFsAdapter } from '../../smart-fs/adapters/test_fs.js';

export function load_test_env(t) {
  t.context.mock_env = {
    item_types: {
      SmartSource: SmartSource,
      SmartBlock: SmartBlock,
    },
    main: {
      read_file: async (path) => {
        return t.context.mock_env.smart_fs.read(path);
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

  // Initialize SmartFs with TestFsSmartFsAdapter
  t.context.mock_env.smart_fs = new SmartFs(t.context.mock_env, {
    adapter: TestFsSmartFsAdapter,
    env_path: '/mock/env/path'
  });
  // add fs getter to mock_env
  t.context.mock_env.fs = t.context.mock_env.smart_fs;

  t.context.mock_env.smart_chunks = new SmartChunks(t.context.mock_env);
  t.context.mock_env.smart_blocks = new SmartBlocks(t.context.mock_env);
  t.context.mock_env.smart_sources = new SmartSources(t.context.mock_env);
}