const { Brain, Collection, CollectionItem, LongTermMemory } = require('./smart-collections');
// MOCKS
class TestItems extends Collection { }
class TestItem extends CollectionItem { }
class Parents extends Collection { }
class Parent extends CollectionItem {
  static get defaults() {
    return {
      data: {
        parent_prop: 'parent_value',
        child_prop: null,
        grand_prop: null,
      },
    };
  }
  get_key() { return 'parent_key'; }
}
class Childs extends Parents { }
class Child extends CollectionItem {
  static get defaults() {
    return {
      data: {
        parent_prop: 'child_value',
        child_prop: 'child_value',
        grand_prop: null,
      },
    };
  }
  get_key() { return 'child_key'; }
}
class Grands extends Childs { }
class Grand extends CollectionItem {
  static get defaults() {
    return {
      data: {
        parent_prop: 'grand_value',
        child_prop: 'grand_value',
        grand_prop: 'grand_value',
      },
    };
  }
  get_key() { return 'grand_key'; }
}
// STUBS
Brain.prototype.load_config = () => { };
// EXPORTS
exports.Brain = Brain;
exports.LongTermMemory = LongTermMemory;
exports.Collection = Collection;
exports.CollectionItem = CollectionItem;
exports.Parent = Parent;
exports.Child = Child;
exports.Grand = Grand;
exports.TestItem = TestItem;
exports.TestItems = TestItems;
exports.Parents = Parents;
exports.Childs = Childs;
exports.Grands = Grands;