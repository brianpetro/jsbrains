// Copyright (c) Brian Joseph Petro

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

export class SmartChange {
    constructor(env, opts={}) {
        this.env = env;
        this.adapters = opts.adapters || {};
    }

    get_adapter(change_opts) {
        return this.adapters[change_opts.file_type] || this.adapters.default;
    }

    wrap(change_type, change_opts) {
        const adapter = this.get_adapter(change_opts);
        return adapter.wrap(change_type, change_opts);
    }
    async destroy(entity, opts={}){
        const current_content = await entity.read();
        const wrapped_content = this.wrap('content', { before: current_content, ...opts });
        await entity._update(wrapped_content);
    }
    async update(entity, new_content) {
        const current_content = await entity.read();
        const wrapped_content = this.wrap('content', { before: current_content, after: new_content });
        await entity._update(wrapped_content);
    }
    async move_to(from_entity, to_entity) {
        const content = await from_entity.read();
        const from_content = this.wrap('location', { to_key: to_entity.key, before: content });
        await from_entity._update(from_content);
        const to_content = this.wrap('location', { from_key: from_entity.key, after: content });
        await to_entity._append(to_content);
    }

    // DEPRECATED
    before(change_type, change_opts) {
        const adapter = this.get_adapter(change_opts);
        return adapter.before(change_type, change_opts);
    }
    after(change_type, change_opts) {
        const adapter = this.get_adapter(change_opts);
        return adapter.after(change_type, change_opts);
    }

    unwrap(content, change_opts) {
        const adapter = this.get_adapter(change_opts);
        return adapter.unwrap(content);
    }
}