import test from 'ava';
import { merge_env_config } from './merge_env_config.js';
import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

test('should merge simple properties', t => {
  const target = { a: 1 };
  const incoming = { b: 2 };
  const expected = { a: 1, b: 2 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should overwrite existing primitive properties', t => {
  const target = { a: 1 };
  const incoming = { a: 2 };
  const expected = { a: 2 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should concatenate arrays', t => {
  const target = { list: [1, 2] };
  const incoming = { list: [2, 3, 4] };
  const expected = { list: [1, 2, 3, 4] }; // 2 is not duplicated
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should concatenate incoming array to non-existent target array', t => {
  const target = { other: 'value' };
  const incoming = { list: [1, 2, 2] };
  const expected = { other: 'value', list: [1, 2] }; // duplicates removed
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should initialize target object key if merging object', t => {
  const target = {};
  const incoming = { nested: { a: 1 } };
  const expected = { nested: { a: 1 } };
  merge_env_config(target, incoming);
  t.deepEqual(target, expected);
});

test('should merge null values', t => {
  const target = { a: 1 };
  const incoming = { b: null };
  const expected = { a: 1, b: null };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should overwrite with null value', t => {
  const target = { a: 1 };
  const incoming = { a: null };
  const expected = { a: null };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
});

test('should handle empty incoming object', t => {
  const target = { a: 1 };
  const incoming = {};
  const expected = { a: 1 };
  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
  t.is(result, target); // Should return the same target object instance
});

test('should handle empty target object', t => {
  const target = {};
  const incoming = { a: 1, b: [2], c: { d: 3 } };
  merge_env_config(target, incoming); // Modifies target in place
  const expected_after_merge = { a: 1, b: [2], c: {} }; // c initialized
  deep_merge_no_overwrite(expected_after_merge.c, { d: 3 }); // deep merge applied

  t.deepEqual(target, expected_after_merge);
});

test('should not merge if incoming value is same object reference as target', t => {
  const shared_object = { x: 1 };
  const target = { a: shared_object };
  const incoming = { a: shared_object };
  const expected = { a: { x: 1 } }; // Should remain unchanged

  const result = merge_env_config(target, incoming);
  t.deepEqual(result, expected);
  t.is(result.a, shared_object); // Ensure reference wasn't broken unnecessarily
});

class ColV1 {}
ColV1.version = 1;
class ColV2 {}
ColV2.version = 2;

test('newer collection version replaces older one', t => {
  const target = { collections: { foo: { class: ColV1, flag: true } } };
  const incoming = { collections: { foo: { class: ColV2 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColV2,
    'incoming class replaces the older version'
  );
  t.true(
    target.collections.foo.flag,
    'non-conflicting props are preserved'
  );
});

test('newer action retains omitted metadata and all placements', t => {
  const old_action_fn = () => 'old';
  const new_action_fn = () => 'new';
  const placements = {
    commands: {
      open_action: { name: 'Open action' },
    },
    ribbon_icons: {
      open_action: { icon_name: 'open' },
    },
    menus: {
      'source:menu': { title: 'Open action' },
    },
    webview_methods: {
      chatgpt: {
        append_input: {
          method_name: 'append_input',
          source: 'async function append_input() {}',
        },
      },
    },
  };
  const target = {
    actions: {
      test: {
        version: 1,
        action: old_action_fn,
        display_description: 'Existing description',
        ...placements,
      },
    },
  };

  merge_env_config(target, {
    actions: {
      test: {
        version: 2,
        action: new_action_fn,
        display_name: 'New action',
      },
    },
  });

  const merged_action = target.actions.test;
  t.is(merged_action.action, new_action_fn);
  t.is(merged_action.version, 2);
  t.is(merged_action.display_name, 'New action');
  t.is(merged_action.display_description, 'Existing description');
  t.deepEqual(
    {
      commands: merged_action.commands,
      ribbon_icons: merged_action.ribbon_icons,
      menus: merged_action.menus,
      webview_methods: merged_action.webview_methods,
    },
    placements,
  );
});

test('action placement convergence retains missing metadata without merging conflicts', t => {
  const new_action_fn = () => 'new';
  const target = {
    actions: {
      test: {
        version: 1,
        action() {},
        commands: {
          shared: {
            name: 'Old name',
            description: 'Retained description',
            hotkeys: [{ modifiers: ['Mod'], key: 'O' }],
          },
          old_only: { name: 'Old only' },
        },
        menus: {
          'source:menu': {
            title: 'Old title',
            icon: 'retained-icon',
          },
          'source:disabled_menu': {
            title: 'Old disabled title',
          },
        },
      },
    },
  };

  merge_env_config(target, {
    actions: {
      test: {
        version: 2,
        action: new_action_fn,
        commands: {
          shared: {
            name: 'New name',
            hotkeys: [{ modifiers: ['Mod'], key: 'N' }],
          },
          new_only: { name: 'New only' },
        },
        menus: {
          'source:menu': { title: 'New title' },
          'source:disabled_menu': false,
        },
      },
    },
  });

  merge_env_config(target, {
    actions: {
      test: {
        version: 1,
        commands: {
          shared: {
            name: 'Older name',
            hotkeys: [{ modifiers: ['Mod'], key: 'L' }],
          },
          late_only: { name: 'Late only' },
        },
        menus: {
          'source:menu': {
            title: 'Older title',
            icon: 'older-icon',
          },
          'source:disabled_menu': {
            title: 'Older disabled title',
          },
        },
        ribbon_icons: {
          stable: { icon_name: 'star' },
        },
      },
    },
  });

  const merged_action = target.actions.test;
  t.is(merged_action.action, new_action_fn);
  t.deepEqual(merged_action.commands.shared, {
    name: 'New name',
    hotkeys: [{ modifiers: ['Mod'], key: 'N' }],
    description: 'Retained description',
  });
  t.is(merged_action.commands.old_only.name, 'Old only');
  t.is(merged_action.commands.new_only.name, 'New only');
  t.is(merged_action.commands.late_only.name, 'Late only');
  t.deepEqual(merged_action.menus['source:menu'], {
    title: 'New title',
    icon: 'retained-icon',
  });
  t.false(merged_action.menus['source:disabled_menu']);
  t.is(merged_action.ribbon_icons.stable.icon_name, 'star');
});

test('same action version from newer SmartEnv retains omitted metadata', t => {
  const old_action_fn = () => 'old';
  const new_action_fn = () => 'new';
  const target = {
    version: '2.4.2',
    actions: {
      test: {
        version: '1.0.0',
        action: old_action_fn,
        commands: {
          stable: { name: 'Stable command' },
        },
      },
    },
  };

  merge_env_config(target, {
    version: '2.4.3',
    actions: {
      test: {
        version: '1.0.0',
        action: new_action_fn,
      },
    },
  });

  t.is(target.actions.test.action, new_action_fn);
  t.is(target.actions.test.commands.stable.name, 'Stable command');
});

/* ------------------------------------------------------------------
 * semver-specific tests
 * -----------------------------------------------------------------*/

class ColSem10 {}
ColSem10.version = '1.0.0';
class ColSem11 {}
ColSem11.version = '1.1.0';

test('collection semver strings are compared correctly', t => {
  const target = {
    collections: { foo: { class: ColSem10, from: 'old', keep: true } }
  };
  const incoming = {
    collections: { foo: { class: ColSem11, from: 'new' } }
  };

  merge_env_config(target, incoming);

  t.is(target.collections.foo.class, ColSem11, 'newer semver wins');
  t.is(target.collections.foo.from, 'new', 'incoming props override');
  t.true(
    target.collections.foo.keep,
    'older props are preserved when not redefined'
  );
});

test('collection missing version is treated as 0 against semver', t => {
  class ColNoVersion {}
  class ColSem001 {}
  ColSem001.version = '0.0.1';

  const target = { collections: { foo: { class: ColNoVersion } } };
  const incoming = { collections: { foo: { class: ColSem001 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColSem001,
    'semver 0.0.1 should beat missing version (0)'
  );
});

test('semver string wins tie with numeric version', t => {
  function ComponentV1Num () {}
  ComponentV1Num.version = 1;
  function ComponentV1Str () {}
  ComponentV1Str.version = '1';

  const target = { components: { thing: ComponentV1Num } };
  const incoming = { components: { thing: ComponentV1Str } };

  merge_env_config(target, incoming);

  t.is(
    target.components.thing,
    ComponentV1Str,
    'string semver "1" should win over numeric 1 when numerically equal'
  );
});

test('component semver string compares against numeric version', t => {
  function CompV1 () {}
  CompV1.version = 1;
  function CompV101 () {}
  CompV101.version = '1.0.1';

  const target = { components: { c: CompV1 } };
  const incoming = { components: { c: CompV101 } };

  merge_env_config(target, incoming);

  t.is(
    target.components.c,
    CompV101,
    '1.0.1 should be considered newer than numeric 1'
  );
});

function a_parser () {}
test("same collection version doesn't duplicate existing same function in array", t => {
  const target = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };
  const incoming = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.parsers.length,
    1,
    'parsers array should not duplicate existing function'
  );

  // Add another function to incoming, ensure both are present, no duplicates
  function b_parser () {}
  const target2 = {
    collections: { foo: { class: ColV1, parsers: [a_parser] } }
  };
  const incoming2 = {
    collections: { foo: { class: ColV1, parsers: [a_parser, b_parser] } }
  };
  merge_env_config(target2, incoming2);
  t.deepEqual(
    target2.collections.foo.parsers,
    [a_parser, b_parser],
    'should merge arrays without duplicates and include new items'
  );
});

// Test merging arrays of strings prevents duplicates
test('should merge arrays of strings without duplicates', t => {
  const target = { tags: ['a', 'b'] };
  const incoming = { tags: ['b', 'c', 'd'] };
  const expected = { tags: ['a', 'b', 'c', 'd'] };
  const result = merge_env_config(target, incoming);
  t.deepEqual(
    result,
    expected,
    'strings in arrays should not be duplicated'
  );
});

test('older or same version does NOT replace BUT includes extra props', t => {
  const target = { collections: { foo: { class: ColV2 } } };
  const incoming = { collections: { foo: { class: ColV1, extra: 123 } } };

  merge_env_config(target, incoming);

  t.is(
    target.collections.foo.class,
    ColV2,
    'existing newer class kept'
  );
  t.is(
    target.collections.foo.extra,
    123,
    'older definition merged with no overwrite'
  );
});

test('newer component version replaces older one', t => {
  const old_component = function () {};
  const new_component = function () {};
  new_component.version = 2;
  const target = { components: { test_component: old_component } };
  const incoming = { components: { test_component: new_component } };

  merge_env_config(target, incoming);

  t.is(
    target.components.test_component,
    new_component,
    'newer component replaces older one'
  );
});

test('same component version prefers incoming from higher SmartEnv version', t => {
  const old_render = () => 'old';
  const new_render = () => 'new';
  const target = {
    version: '2.4.2',
    components: {
      panel: { render: old_render, version: '1.0.0', target_only: true }
    }
  };
  const incoming = {
    version: '2.4.3',
    components: {
      panel: { render: new_render, version: '1.0.0' }
    }
  };

  merge_env_config(target, incoming);

  t.is(target.components.panel.render, new_render);
  t.false(Object.prototype.hasOwnProperty.call(target.components.panel, 'target_only'));
});

test('same component version keeps existing from higher SmartEnv version', t => {
  const old_render = () => 'old';
  const new_render = () => 'new';
  const target = {
    version: '2.4.3',
    components: {
      panel: { render: old_render, version: '1.0.0' }
    }
  };
  const incoming = {
    version: '2.4.2',
    components: {
      panel: { render: new_render, version: '1.0.0', incoming_only: true }
    }
  };

  merge_env_config(target, incoming);

  t.is(target.components.panel.render, old_render);
  t.true(target.components.panel.incoming_only);
});

test('same collection version prefers incoming from higher SmartEnv version', t => {
  class ColSameOld {}
  class ColSameNew {}
  const target = {
    version: '2.4.2',
    collections: {
      notes: { class: ColSameOld, version: '1.0.0', target_only: true }
    }
  };
  const incoming = {
    version: '2.4.3',
    collections: {
      notes: { class: ColSameNew, version: '1.0.0', incoming_only: true }
    }
  };

  merge_env_config(target, incoming);

  t.is(target.collections.notes.class, ColSameNew);
  t.true(target.collections.notes.incoming_only);
  t.true(target.collections.notes.target_only);
});

test('unversioned components use SmartEnv version as tie-breaker', t => {
  const old_render = () => 'old';
  const newer_render = () => 'newer';
  const lower_version_render = () => 'lower';
  const target = {
    version: '2.4.2',
    components: {
      panel: { render: old_render }
    }
  };

  merge_env_config(target, {
    version: '2.4.3',
    components: {
      panel: { render: newer_render }
    }
  });

  t.is(target.components.panel.render, newer_render);
  t.false(Object.prototype.hasOwnProperty.call(target.components.panel, 'version'));

  merge_env_config(target, {
    version: '2.4.1',
    components: {
      panel: { render: lower_version_render }
    }
  });

  t.is(target.components.panel.render, newer_render);
});

test('same component version keeps record from highest source SmartEnv version across multiple merges', t => {
  const latest_render = () => 'latest';
  const oldest_render = () => 'oldest';
  const middle_render = () => 'middle';
  const target = {};

  merge_env_config(target, {
    version: '2.4.3',
    components: {
      panel: { render: latest_render, version: '1.0.0' }
    }
  });
  merge_env_config(target, {
    version: '2.4.1',
    components: {
      panel: { render: oldest_render, version: '1.0.0' }
    }
  });
  merge_env_config(target, {
    version: '2.4.2',
    components: {
      panel: { render: middle_render, version: '1.0.0' }
    }
  });

  t.is(target.components.panel.render, latest_render);
  t.is(target.version, '2.4.3');
});

test('same component version can upgrade a lower source record even when root version is already higher', t => {
  const older_render = () => 'older';
  const newer_render = () => 'newer';
  const target = { version: '2.4.3', components: {} };

  merge_env_config(target, {
    version: '2.4.1',
    components: {
      panel: { render: older_render, version: '1.0.0' }
    }
  });
  merge_env_config(target, {
    version: '2.4.2',
    components: {
      panel: { render: newer_render, version: '1.0.0' }
    }
  });

  t.is(target.components.panel.render, newer_render);
  t.is(target.version, '2.4.3');
});

test('merges item actions without overwriting', t => {
  const target = { items: { note: { actions: { a: 1 } } } };
  const incoming = { items: { note: { actions: { b: 2, a: 3 } } } };
  merge_env_config(target, incoming);
  t.deepEqual(target.items.note.actions, { a: 1, b: 2 });
});

test('adds new item definition when missing', t => {
  const target = { items: {} };
  const incoming = { items: { block: { actions: { c: 3 } } } };
  merge_env_config(target, incoming);
  t.deepEqual(target.items.block.actions, { c: 3 });
});


test('handles versions components using semver', t => {
  function render_0() {}
  function render_1() {}
  function render_2() {}
  const comp_v1 = { render: render_1, version: '2.0.0' };
  const comp_v2 = { render: render_2, version: '3.0.0' };
  const target = { components: { render: render_0 } };
  const incoming = { components: { render: comp_v1 } };

  merge_env_config(target, incoming);
  t.is(
    target.components.render,
    comp_v1,
    '2.0.0 should replace no-version component'
  );
  const incoming2 = { components: { render: comp_v2 } };
  merge_env_config(target, incoming2);
  t.is(
    target.components.render,
    comp_v2,
    '3.0.0 should replace 2.0.0 component'
  );
});

