import test from 'ava';
import { process_object } from './process_object.js';

test('modifies primitive values', async t => {
    const input = {
        a: 1,
        b: 'hello',
        c: true
    };
    const expected = {
        a: 2,
        b: 'HELLO',
        c: false
    };
    const result = await process_object(input, async (value) => {
        if (typeof value === 'number') return value + 1;
        if (typeof value === 'string') return value.toUpperCase();
        if (typeof value === 'boolean') return !value;
        return value;
    });
    t.deepEqual(result, expected);
});

test('handles nested objects', async t => {
    const input = {
        a: 1,
        b: {
            c: 'hello',
            d: {
                e: true
            }
        }
    };
    const expected = {
        a: 2,
        b: {
            c: 'HELLO',
            d: {
                e: false
            }
        }
    };
    const result = await process_object(input, async (value) => {
        if (typeof value === 'number') return value + 1;
        if (typeof value === 'string') return value.toUpperCase();
        if (typeof value === 'boolean') return !value;
        return value;
    });
    t.deepEqual(result, expected);
});

test('handles arrays', async t => {
    const input = {
        a: [1, 2, 3],
        b: ['hello', 'world'],
        c: [true, false]
    };
    const expected = {
        a: [2, 3, 4],
        b: ['HELLO', 'WORLD'],
        c: [false, true]
    };
    const result = await process_object(input, async (value) => {
        if (typeof value === 'number') return value + 1;
        if (typeof value === 'string') return value.toUpperCase();
        if (typeof value === 'boolean') return !value;
        return value;
    });
    t.deepEqual(result, expected);
});

test('handles null and undefined', async t => {
    const input = {
        a: null,
        b: undefined,
        c: {
            d: null,
            e: undefined
        }
    };
    const expected = {
        a: null,
        b: undefined,
        c: {
            d: null,
            e: undefined
        }
    };
    const result = await process_object(input, async (value) => value);
    t.deepEqual(result, expected);
});

// test('handles circular references', async t => {
//     const input = {
//         a: 1,
//         b: 'hello'
//     };
//     input.c = input;
//     const result = await walk_object(input, async value => value);
//     t.is(result.c, result);
// });

test('handles functions', async t => {
    const input = {
        a: 1,
        b: () => 'hello'
    };
    const result = await process_object(input, async value => {
        if (typeof value === 'function') return value();
        return value;
    });
    t.deepEqual(result, {a: 1, b: 'hello'});
});

test('handles Date objects', async t => {
    const date = new Date('2023-06-01');
    const input = {
        a: date,
        b: {c: date}
    };
    const result = await process_object(input, async value => {
        if (value instanceof Date) return value.getFullYear();
        return value;
    });
    t.deepEqual(result, {a: 2023, b: {c: 2023}});
});

test('handles empty objects and arrays', async t => {
    const input = {
        a: {},
        b: []
    };
    const result = await process_object(input, async value => value);
    t.deepEqual(result, input);
});

test('runs function when value is class instance', async t => {
    class TestClass {
        constructor(value) {
            this.value = value;
        }
        getValue() {
            return this.value;
        }
    }

    const input = {
        a: new TestClass(5),
        b: {
            c: new TestClass(10)
        }
    };

    const expected = {
        a: 5,
        b: {
            c: 10
        }
    };

    const result = await process_object(input, async value => {
        if (value instanceof TestClass) return value.getValue();
        return value;
    });

    t.deepEqual(result, expected);
});

test('handles async functions', async t => {
    const input = {
        a: 1,
        b: 'hello',
        c: true
    };
    const expected = {
        a: 2,
        b: 'HELLO',
        c: false
    };
    const result = await process_object(input, async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async operation
        if (typeof value === 'number') return value + 1;
        if (typeof value === 'string') return value.toUpperCase();
        if (typeof value === 'boolean') return !value;
        return value;
    });
    t.deepEqual(result, expected);
});

test('handles nested async operations', async t => {
    const input = {
        a: 1,
        b: {
            c: 'hello',
            d: {
                e: true
            }
        }
    };
    const expected = {
        a: 2,
        b: {
            c: 'HELLO',
            d: {
                e: false
            }
        }
    };
    const result = await process_object(input, async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async operation
        if (typeof value === 'number') return value + 1;
        if (typeof value === 'string') return value.toUpperCase();
        if (typeof value === 'boolean') return !value;
        return value;
    });
    t.deepEqual(result, expected);
});
