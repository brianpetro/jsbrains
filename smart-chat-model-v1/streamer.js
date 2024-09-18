class SmartStreamer {
  constructor(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      withCredentials = false
    } = options;

    this.url = url;
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.withCredentials = withCredentials;
    this.listeners = {};
    this.readyState = this.CONNECTING;
    this.progress = 0;
    this.chunk = '';
    this.last_event_id = '';
    this.xhr = null;
    this.FIELD_SEPARATOR = ':';
    this.INITIALIZING = -1;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
  }

  /**
   * Adds an event listener for the specified event type.
   *
   * @param {string} type - The type of the event.
   * @param {Function} listener - The listener function to be called when the event is triggered.
   */
  addEventListener(type, listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    if (!this.listeners[type].includes(listener)) this.listeners[type].push(listener);
  }

  /**
   * Removes an event listener from the SmartStreamer instance.
   *
   * @param {string} type - The type of event to remove the listener from.
   * @param {Function} listener - The listener function to remove.
   */
  removeEventListener(type, listener) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((callback) => callback !== listener);
    if (this.listeners[type].length === 0) delete this.listeners[type];
  }

  /**
   * Dispatches an event to the appropriate event handlers.
   *
   * @param {Event} event - The event to be dispatched.
   * @returns {boolean} - Returns true if the event was successfully dispatched, false otherwise.
   */
  dispatchEvent(event) {
    if (!event) return true;
    event.source = this;
    const onHandler = 'on' + event.type;
    if (Object.prototype.hasOwnProperty.call(this, onHandler)) {
      this[onHandler].call(this, event);
      if (event.defaultPrevented) return false;
    }
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach((callback) => {
        callback(event);
        return !event.defaultPrevented;
      });
    }
    return true;
  }

  /**
   * Initiates the streaming process.
   */
  stream() {
    this.#setReadyState(this.CONNECTING);
    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener('progress', this.#onStreamProgress.bind(this));
    this.xhr.addEventListener('load', this.#onStreamLoaded.bind(this));
    this.xhr.addEventListener('readystatechange', this.#checkStreamClosed.bind(this));
    this.xhr.addEventListener('error', this.#onStreamFailure.bind(this));
    this.xhr.addEventListener('abort', this.#onStreamAbort.bind(this));
    this.xhr.open(this.method, this.url);
    for (const header in this.headers) {
      this.xhr.setRequestHeader(header, this.headers[header]);
    }
    if (this.last_event_id) this.xhr.setRequestHeader('Last-Event-ID', this.last_event_id);
    this.xhr.withCredentials = this.withCredentials;
    this.xhr.send(this.body);
  }
  /**
   * Ends the streamer connection.
   * Aborts the current XHR request and sets the ready state to CLOSED.
   */
  end() {
    if (this.readyState === this.CLOSED) return;
    this.xhr.abort();
    this.xhr = null;
    this.#setReadyState(this.CLOSED);
  }

  // private methods
  #setReadyState(state) {
    const event = new CustomEvent('readyStateChange');
    event.readyState = state;
    this.readyState = state;
    this.dispatchEvent(event);
  }
  #onStreamFailure(e) {
    const event = new CustomEvent('error');
    event.data = e.currentTarget.response;
    this.dispatchEvent(event);
    this.end();
  }
  #onStreamAbort(e) {
    const event = new CustomEvent('abort');
    this.end();
  }
  #onStreamProgress(e) {
    if (!this.xhr) return;
    if (this.xhr.status !== 200) {
      this.#onStreamFailure(e);
      return;
    }
    if (this.readyState === this.CONNECTING) {
      this.dispatchEvent(new CustomEvent('open'));
      this.#setReadyState(this.OPEN);
    }
    const data = this.xhr.responseText.substring(this.progress);
    this.progress += data.length;
    // data.split(/(\r\n|\r|\n){2}/g).forEach((part) => {
    data.split(/(\r\n|\r|\n)/g).forEach((part) => {
      if (part.trim().length === 0) {
        this.dispatchEvent(this.#parseEventChunk(this.chunk.trim()));
        this.chunk = '';
      } else {
        this.chunk += part;
      }
    });
  }
  #onStreamLoaded(e) {
    this.#onStreamProgress(e);
    this.dispatchEvent(this.#parseEventChunk(this.chunk));
    this.chunk = '';
  }
  #parseEventChunk(chunk) {
    if (!chunk || chunk.length === 0) return null;
    const e = { id: null, retry: null, data: '', event: 'message', text: '' };
    chunk.split(/(\r\n|\r|\n)/).forEach((line) => {
      // line = line.trimRight();
      line = line.trim();
      const index = line.indexOf(this.FIELD_SEPARATOR);
      if (index <= 0) return;
      // const field = line.substring(0, index);
      // also remove quotes
      const field = line.substring(0, index).replace(/^"|"$/g, '');
      if(!['id', 'retry', 'data', 'event', 'text'].includes(field)) return;
      // if (!(field in e)) return;
      // const value = line.substring(index + 1).trimLeft();
      const value = line.substring(index + 1).trim().replace(/^"|"$/g, '');
      // if (field === 'data') e[field] += value;
      // else e[field] = value;
      e.data += value;
    });
    if (e.id) this.last_event_id = e.id;
    const event = new CustomEvent(e.event || 'message');
    event.id = e.id;
    event.data = e.data || '';
    event.last_event_id = this.last_event_id;
    return event;
  }
  #checkStreamClosed() {
    if (!this.xhr) return;
    if (this.xhr.readyState === XMLHttpRequest.DONE) this.#setReadyState(this.CLOSED);
  }

}

exports.SmartStreamer = SmartStreamer;
