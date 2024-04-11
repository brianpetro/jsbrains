const { 
  Brain,
  Parent,
  Child,
  Grand,
  TestItem,
  TestItems,
  Parents,
  Childs,
  Grands,
} = require('./test_classes');
function init_brain(t, opts = {}) {
  const brain = new Brain();
  brain.item_types = {
    TestItem,
    Parent,
    Child,
    Grand,
  };
  if(opts.item_types) Object.assign(brain.item_types, opts.item_types);
  brain.collections = {
    test_items: TestItems,
    parents: Parents,
    childs: Childs,
    grands: Grands,
  };
  if(opts.collections) Object.assign(brain.collections, opts.collections);
  brain.config = {
    collections: {
      test_items: {
        test_item_config: 'test_item_config_value',
      },
      parents: {
        parent_config: 'parent_config_value',
      },
      childs: {
        child_config: 'child_config_value',
      },
      grands: {
        grand_config: 'grand_config_value',
      },
    },
    data_path: './tmp',
  };
  if(opts.config) Object.assign(brain.config, opts.config);
  brain.init();
  return t.context = {
    ...t.context,
    brain,
  };
}
function init_test_item(t){
  const { brain } = t.context;
  const test_collection = brain.test_items;
  const test_item = test_collection.create_or_update({ key: 'test' });
  return t.context = {
    ...t.context,
    test_collection,
    test_item,
  };
}
exports.init_brain = init_brain;
exports.init_test_item = init_test_item;