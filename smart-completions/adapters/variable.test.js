import test from 'ava';
import { SmartCompletionVariableAdapter } from './variable.js';
import { replace_folder_tree_var } from 'obsidian-smart-env/utils/replace_folder_tree_var.js';
import { replace_folders_top_var } from 'obsidian-smart-env/utils/replace_folders_top_var.js';
import { replace_vault_tags_var } from 'obsidian-smart-env/utils/replace_vault_tags_var.js';
import { replace_recent_n_var } from 'obsidian-smart-env/utils/replace_recent_n_var.js';

const env = {
  smart_sources: {
    fs: {
      folder_paths: ['one/two/', 'three/'],
      files: {
        'a.md': { path: 'a.md', stat: { mtime: 2 } },
        'b.md': { path: 'b.md', stat: { mtime: 1 } }
      }
    }
  },
  app: {
    metadataCache: {
      getTags() { return { '#tagA': {}, '#tagB': {} }; }
    }
  }
};

function register_defaults() {
  SmartCompletionVariableAdapter.registry.splice(0);
  SmartCompletionVariableAdapter.register(
    txt => /{{\s*folder_tree\s*}}/i.test(txt),
    replace_folder_tree_var
  );
  SmartCompletionVariableAdapter.register(
    txt => /{{\s*folders_top\s*}}/i.test(txt),
    replace_folders_top_var
  );
  SmartCompletionVariableAdapter.register(
    txt => /{{\s*(?:tags|vault_tags)\s*}}/i.test(txt),
    replace_vault_tags_var
  );
  SmartCompletionVariableAdapter.register(
    txt => /{{\s*recent_(\d+)\s*}}/i.test(txt),
    replace_recent_n_var
  );
}

function make_item(content) {
  return {
    env,
    data: {
      completion: { request: { messages: [ { role: 'system', content } ] } }
    }
  };
}

test('default variables replaced', async t => {
  register_defaults();
  const item = {
    env,
    data: {
      completion: { request: { messages: [
        { role: 'system', content: '{{folder_tree}}' },
        { role: 'system', content: '{{folders_top}}' },
        { role: 'system', content: '{{tags}}' },
        { role: 'system', content: '{{recent_1}}' }
      ] } }
    }
  };
  const adapter = new SmartCompletionVariableAdapter(item);
  await adapter.to_request();
  const msgs = item.data.completion.request.messages;
  t.true(msgs[0].content.includes('one/'));
  t.true(msgs[1].content.includes('one/'));
  t.true(msgs[2].content.includes('tagA'));
  t.true(msgs[3].content.includes('a.md'));
});

test('custom variable registration', async t => {
  register_defaults();
  const initial_len = SmartCompletionVariableAdapter.registry.length;
  SmartCompletionVariableAdapter.register(
    txt => txt.includes('{{foo}}'),
    function(txt){ return txt.replace('{{foo}}', 'bar'); }
  );
  const item = make_item('hello {{foo}}');
  const adapter = new SmartCompletionVariableAdapter(item);
  await adapter.to_request();
  t.is(item.data.completion.request.messages[0].content, 'hello bar');
  SmartCompletionVariableAdapter.registry.splice(initial_len);
});
