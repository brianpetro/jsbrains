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

class SmartEnv {
  constructor(main, opts={}) {
    this[camel_case_to_snake_case(this.constructor.name)] = main; // ex. smart_connections_plugin
    this.main = main; // DEPRECATED in favor of main class name converted to snake case
    this.plugin = this.main; // DEPRECATED in favor of main
    Object.assign(this, opts);
  }
  static create(main, opts={}) {
    const global_ref = opts.global_ref || window || global;
    const existing_smart_env = global_ref.smart_env;
    if(existing_smart_env instanceof SmartEnv) {
      existing_smart_env[camel_case_to_snake_case(this.name)] = main;
      Object.keys(opts).forEach(key => {
        if(typeof opts[key] === 'object'){
          if(Array.isArray(opts[key])){
            existing_smart_env[key] = [
              ...(existing_smart_env[key] || []),
              ...opts[key]
            ];
          } else if(opts[key] !== null) {
            existing_smart_env[key] = {
              ...(existing_smart_env[key] || {}),
              ...opts[key]
            }
          }
        } else {
          if(existing_smart_env[key]) console.warn(`SmartEnv: Overwriting existing property ${key} with ${opts[key]}`);
          existing_smart_env[key] = opts[key];
        }
      });
      // add methods from this class to the existing smart env
      Object.getOwnPropertyNames(this.constructor.prototype).forEach(name => {
        if(name !== 'constructor'){
          existing_smart_env[name] = this[name];
        }
      });
      return existing_smart_env;
    }
    return new SmartEnv(main, opts);
  }
}
export { SmartEnv };

function camel_case_to_snake_case(str) {
  const result = str
    .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^_/, '') // remove leading underscore
  ;
  return result;
}