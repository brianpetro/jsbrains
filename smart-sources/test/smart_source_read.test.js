import test from 'ava';
import { SmartSource } from '../smart_source.js';

test('read preserves default swallowed-error behavior', async t => {
  const read_error = new Error('read failed');
  const source = {
    key: 'Notes/Failure.md',
    async use_source_adapter(method, opts) {
      t.is(method, 'read');
      t.deepEqual(opts, {});
      throw read_error;
    },
  };

  t.is(await SmartSource.prototype.read.call(source), '');
});

test('read preserves default nullish-to-empty behavior', async t => {
  for (const result of [null, undefined]) {
    const source = {
      key: 'Notes/Nullish.md',
      async use_source_adapter() {
        return result;
      },
    };

    t.is(await SmartSource.prototype.read.call(source), '');
  }
});

test('read throw_on_error preserves empty content and consumes the control option', async t => {
  let received_opts;
  const source = {
    key: 'Notes/Empty.md',
    async use_source_adapter(method, opts) {
      t.is(method, 'read');
      received_opts = opts;
      return '';
    },
  };

  const result = await SmartSource.prototype.read.call(source, {
    throw_on_error: true,
    render_output: true,
  });

  t.is(result, '');
  t.deepEqual(received_opts, { render_output: true });
});

test('read throw_on_error rethrows adapter failures', async t => {
  const read_error = new Error('read failed');
  const source = {
    key: 'Notes/Failure.md',
    async use_source_adapter() {
      throw read_error;
    },
  };

  const error = await t.throwsAsync(() => {
    return SmartSource.prototype.read.call(source, {
      throw_on_error: true,
    });
  });

  t.is(error, read_error);
});

test('read throw_on_error treats nullish adapter results as failures', async t => {
  for (const result of [null, undefined]) {
    const source = {
      key: 'Notes/Nullish.md',
      async use_source_adapter() {
        return result;
      },
    };

    await t.throwsAsync(
      () => SmartSource.prototype.read.call(source, {
        throw_on_error: true,
      }),
      { message: 'No content returned while reading Notes/Nullish.md.' },
    );
  }
});
