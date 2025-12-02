export function add_backward_compatibility(_class) {
  // getters for backward compatibility
  Object.defineProperty(_class.prototype, 'opts', {
    get: function () { return this.model.settings; }
  });
  Object.defineProperty(_class.prototype, 'api_key', {
    get: function () { return this.model.data.api_key; }
  });
}
