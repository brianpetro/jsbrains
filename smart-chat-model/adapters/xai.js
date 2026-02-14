import {
  SmartChatModelApiAdapter,
  SmartChatModelRequestAdapter,
  SmartChatModelResponseAdapter
} from './_api.js';
import { normalize_error } from 'smart-utils/normalize_error.js';

/**
 * @class SmartChatModelXaiAdapter
 * @extends SmartChatModelApiAdapter
 * Adapter for xAI Grok REST API.
 */
export class SmartChatModelXaiAdapter extends SmartChatModelApiAdapter {
  static key = 'xai';

  static defaults = {
    description: 'xAI Grok',
    type: 'API',
    adapter: 'xAI_Grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    streaming: true,
    models_endpoint: 'https://api.x.ai/v1/models',
    default_model: 'grok-3-mini-beta',
    signup_url: 'https://ide.x.ai'
  };

  get req_adapter() { return XaiCompletionRequestAdapter; }
  get res_adapter() { return XaiCompletionResponseAdapter; }

  /* ------------------------------------------------------------------ *
   *  Model-list helpers
   * ------------------------------------------------------------------ */

  get models_endpoint_method() { return 'GET'; }

  parse_model_data(model_data = {}) {
    const list = model_data.data || model_data.models || [];
    return list.reduce((acc, m) => {
      const id = m.id || m.name;
      acc[id] = {
        id,
        model_name: id,
        description: m.description || `context: ${m.context_length || 'n/a'}`,
        max_input_tokens: m.context_length || 128000,
        multimodal: !!m.modality && m.modality.includes('vision'),
        raw: m
      };
      return acc;
    }, {});
  }

  /* ------------------------------------------------------------------ *
   *  Files helpers
   * ------------------------------------------------------------------ */

  get files_endpoint() {
    try {
      const origin = new URL(this.endpoint).origin;
      return `${origin}/v1/files`;
    } catch {
      return 'https://api.x.ai/v1/files';
    }
  }

  get_file_delete_endpoint(file_id) {
    const safe_id = encodeURIComponent(String(file_id || '').trim());
    return `${this.files_endpoint}/${safe_id}`;
  }

  /* ------------------------------------------------------------------ *
   *  Complete / Stream overrides
   * ------------------------------------------------------------------ */

  async complete(req) {
    let uploaded_file_ids = [];
    try {
      const prepared = await this.prepare_req_with_uploaded_files(req);
      uploaded_file_ids = prepared.uploaded_file_ids;

      const resp = await super.complete(prepared.req);
      return resp;
    } catch (error) {
      return { error: normalize_error(error?.data || error) };
    } finally {
      await this.delete_uploaded_files(uploaded_file_ids);
    }
  }

  async stream(req, handlers = {}) {
    let uploaded_file_ids = [];
    try {
      const prepared = await this.prepare_req_with_uploaded_files(req);
      uploaded_file_ids = prepared.uploaded_file_ids;

      // Track active stream uploads so stop_stream() can clean up if user aborts
      this.active_uploaded_file_ids = uploaded_file_ids.slice();

      return await super.stream(prepared.req, handlers);
    } catch (error) {
      const normalized = normalize_error(error?.data || error);
      if (typeof handlers?.error === 'function') handlers.error(normalized);
      throw normalized;
    } finally {
      // Clear before delete to avoid double-delete if stop_stream fired
      const to_delete = Array.isArray(this.active_uploaded_file_ids)
        ? this.active_uploaded_file_ids.slice()
        : uploaded_file_ids;

      this.active_uploaded_file_ids = [];
      await this.delete_uploaded_files(to_delete);
    }
  }

  stop_stream() {
    super.stop_stream();

    const to_delete = Array.isArray(this.active_uploaded_file_ids)
      ? this.active_uploaded_file_ids.slice()
      : [];

    this.active_uploaded_file_ids = [];

    // best-effort cleanup, don't throw from stop_stream
    this.delete_uploaded_files(to_delete).catch((e) => {
      console.warn('xAI file cleanup failed during stop_stream():', e);
    });
  }

  /**
   * Upload inline files and replace them with file references.
   * Returns:
   *  - req: transformed request with inline file bytes removed
   *  - uploaded_file_ids: list of newly uploaded file ids to cleanup after request
   */
  async prepare_req_with_uploaded_files(req = {}) {
    if (!req || !Array.isArray(req.messages) || req.messages.length === 0) {
      return { req, uploaded_file_ids: [] };
    }

    const needs_upload = req.messages.some((m) => this.message_has_inline_file(m));
    if (!needs_upload) {
      return { req, uploaded_file_ids: [] };
    }

    const uploaded_file_ids = [];

    const messages = await Promise.all(
      req.messages.map(async (message) => {
        return await this.transform_message_for_xai(message, uploaded_file_ids);
      })
    );

    return {
      req: {
        ...req,
        messages
      },
      uploaded_file_ids
    };
  }

  message_has_inline_file(message = {}) {
    if (!Array.isArray(message.content)) return false;

    return message.content.some((part) => {
      if (!part || typeof part !== 'object') return false;

      if (part.type === 'file') {
        const file = part.file || {};
        return typeof file.file_data === 'string' || typeof file.data === 'string';
      }

      if (part.type === 'input_file') {
        return typeof part.file_data === 'string';
      }

      return false;
    });
  }

  async transform_message_for_xai(message = {}, uploaded_file_ids = []) {
    if (!Array.isArray(message.content)) return message;

    const content = await Promise.all(
      message.content.map(async (part) => {
        return await this.transform_content_part_for_xai(part, uploaded_file_ids);
      })
    );

    return {
      ...message,
      content
    };
  }

  async transform_content_part_for_xai(part, uploaded_file_ids = []) {
    if (!part || typeof part !== 'object') return part;

    if (part.type === 'image_url') {
      return this.normalize_image_part(part);
    }

    if (part.type === 'file') {
      return await this.normalize_or_upload_file_part(part, uploaded_file_ids);
    }

    if (part.type === 'input_file') {
      return await this.normalize_or_upload_input_file_part(part, uploaded_file_ids);
    }

    return part;
  }

  normalize_image_part(part = {}) {
    const image_url = part.image_url;
    if (typeof image_url === 'string') {
      return {
        ...part,
        image_url: { url: image_url }
      };
    }
    return part;
  }

  async normalize_or_upload_file_part(part = {}, uploaded_file_ids = []) {
    const file = part.file || {};
    const existing_file_id = file.file_id || file.id || part.file_id || part.id;

    // If user already provided a file_id, don't upload and don't delete later
    if (typeof existing_file_id === 'string' && existing_file_id.length > 0) {
      return {
        type: 'file',
        file: { file_id: existing_file_id }
      };
    }

    const file_data = file.file_data || file.data;
    if (typeof file_data !== 'string' || file_data.length === 0) return part;

    const filename = file.filename || file.name || part.filename || 'document';
    const { mime_type, base64_data } = this.extract_mime_and_base64(
      file_data,
      file.mime_type || file.content_type
    );

    const content_type =
      mime_type ||
      this.infer_mime_type_from_filename(filename) ||
      'application/octet-stream';

    const uploaded = await this.upload_file_to_xai({
      name: filename,
      content_type,
      base64_data
    });

    const file_id = uploaded?.file_id || uploaded?.id;
    if (!file_id) {
      throw new Error(`xAI file upload succeeded but no file id was returned: ${JSON.stringify(uploaded || {})}`);
    }

    uploaded_file_ids.push(file_id);

    // Keep internal canonical "file" shape; request adapter will convert to "input_file"
    return {
      type: 'file',
      file: { file_id }
    };
  }

  async normalize_or_upload_input_file_part(part = {}, uploaded_file_ids = []) {
    const existing_file_id = part.file_id || part.id;
    if (typeof existing_file_id === 'string' && existing_file_id.length > 0) {
      return {
        type: 'file',
        file: { file_id: existing_file_id }
      };
    }

    const file_data = part.file_data;
    if (typeof file_data !== 'string' || file_data.length === 0) return part;

    const filename = part.filename || 'document';
    const { mime_type, base64_data } = this.extract_mime_and_base64(file_data, part.mime_type);

    const content_type =
      mime_type ||
      this.infer_mime_type_from_filename(filename) ||
      'application/octet-stream';

    const uploaded = await this.upload_file_to_xai({
      name: filename,
      content_type,
      base64_data
    });

    const file_id = uploaded?.file_id || uploaded?.id;
    if (!file_id) {
      throw new Error(`xAI file upload succeeded but no file id was returned: ${JSON.stringify(uploaded || {})}`);
    }

    uploaded_file_ids.push(file_id);

    return {
      type: 'file',
      file: { file_id }
    };
  }

  extract_mime_and_base64(file_data, fallback_mime_type = null) {
    const trimmed = String(file_data || '').trim();
    const match = trimmed.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      return {
        mime_type: match[1] || fallback_mime_type,
        base64_data: match[2] || ''
      };
    }

    return {
      mime_type: fallback_mime_type,
      base64_data: trimmed
    };
  }

  infer_mime_type_from_filename(filename = '') {
    const lower = String(filename).toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.md')) return 'text/markdown';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.csv')) return 'text/csv';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return null;
  }

  base64_to_uint8_array(base64_data = '') {
    const clean = String(base64_data || '').trim().replace(/^data:[^;]+;base64,/, '');

    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(clean, 'base64'));
    }

    if (typeof atob === 'function') {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    throw new Error('xAI file upload failed: no base64 decoder available (Buffer/atob)');
  }

  base64_to_blob(base64_data = '', content_type = 'application/octet-stream') {
    if (typeof Blob !== 'function') {
      throw new Error('xAI file upload failed: Blob is not available in this runtime');
    }
    const bytes = this.base64_to_uint8_array(base64_data);
    return new Blob([bytes], { type: content_type });
  }

  safe_parse_json(text = '') {
    try {
      return JSON.parse(String(text || ''));
    } catch {
      return null;
    }
  }

  /**
   * Upload a file to xAI's Files API.
   *
   * MUST be multipart/form-data with:
   *  - form field: "file"
   *  - form field: "purpose" (commonly "assistants")
   *
   * IMPORTANT: Do NOT set Content-Type manually (boundary must be auto-generated).
   */
  async upload_file_to_xai({ name, content_type, base64_data }) {
    if (!this.api_key) {
      throw new Error('xAI file upload failed: missing API key');
    }

    if (typeof FormData !== 'function') {
      throw new Error('xAI file upload failed: FormData is not available in this runtime');
    }

    const file_blob = this.base64_to_blob(base64_data, content_type);

    const form_data = new FormData();
    form_data.append('file', file_blob, name);
    form_data.append('purpose', 'assistants');

    const headers = {
      // DO NOT set Content-Type here
      'Authorization': `Bearer ${this.api_key}`
    };

    // Prefer native fetch when present (best support for multipart)
    if (typeof fetch === 'function') {
      const resp = await fetch(this.files_endpoint, {
        method: 'POST',
        headers,
        body: form_data
      });

      const body_text = await resp.text();
      const json = this.safe_parse_json(body_text);

      if (!resp.ok) {
        const err = new Error(`xAI file upload failed: HTTP ${resp.status} ${resp.statusText || ''}`.trim());
        err.details = {
          status: resp.status,
          status_text: resp.statusText,
          raw_text: body_text?.slice?.(0, 2000) || body_text
        };
        if (json) err.details.json = json;
        throw err;
      }

      if (!json) {
        throw new Error(`xAI file upload failed: expected JSON response, got: ${String(body_text || '').slice(0, 200)}`);
      }

      if (json.error) {
        throw normalize_error(json.error);
      }

      return json;
    }

    // Fallback: SmartHttpRequest adapter if fetch unavailable
    const http_resp = await this.http_adapter.request({
      url: this.files_endpoint,
      method: 'POST',
      headers,
      body: form_data
    });

    const status =
      typeof http_resp?.status === 'number'
        ? http_resp.status
        : (typeof http_resp?.status === 'function' ? await http_resp.status() : null);

    const body_text =
      typeof http_resp?.text === 'function'
        ? await http_resp.text()
        : (typeof http_resp?.response?.text === 'function' ? await http_resp.response.text() : '');

    const json = this.safe_parse_json(body_text);

    if (!status || status < 200 || status >= 300) {
      const err = new Error(`xAI file upload failed: HTTP ${status || 'unknown'}`);
      err.details = {
        status: status || null,
        raw_text: body_text?.slice?.(0, 2000) || body_text
      };
      if (json) err.details.json = json;
      throw err;
    }

    if (!json) {
      throw new Error(`xAI file upload failed: expected JSON response, got: ${String(body_text || '').slice(0, 200)}`);
    }

    if (json.error) {
      throw normalize_error(json.error);
    }

    return json;
  }

  /**
   * Delete a file from xAI Files API (best-effort cleanup).
   * Endpoint: DELETE /v1/files/{file_id} :contentReference[oaicite:5]{index=5}
   */
  async delete_file_from_xai(file_id) {
    const id = String(file_id || '').trim();
    if (!id) return null;

    if (!this.api_key) {
      throw new Error('xAI file delete failed: missing API key');
    }

    const url = this.get_file_delete_endpoint(id);
    const headers = {
      'Authorization': `Bearer ${this.api_key}`
    };

    if (typeof fetch === 'function') {
      const resp = await fetch(url, { method: 'DELETE', headers });
      const body_text = await resp.text();
      const json = this.safe_parse_json(body_text);

      if (!resp.ok) {
        const err = new Error(`xAI file delete failed: HTTP ${resp.status} ${resp.statusText || ''}`.trim());
        err.details = {
          status: resp.status,
          status_text: resp.statusText,
          raw_text: body_text?.slice?.(0, 2000) || body_text
        };
        if (json) err.details.json = json;
        throw err;
      }

      return json || { deleted: true, id };
    }

    const http_resp = await this.http_adapter.request({
      url,
      method: 'DELETE',
      headers
    });

    const status =
      typeof http_resp?.status === 'number'
        ? http_resp.status
        : (typeof http_resp?.status === 'function' ? await http_resp.status() : null);

    const body_text =
      typeof http_resp?.text === 'function'
        ? await http_resp.text()
        : (typeof http_resp?.response?.text === 'function' ? await http_resp.response.text() : '');

    const json = this.safe_parse_json(body_text);

    if (!status || status < 200 || status >= 300) {
      const err = new Error(`xAI file delete failed: HTTP ${status || 'unknown'}`);
      err.details = {
        status: status || null,
        raw_text: body_text?.slice?.(0, 2000) || body_text
      };
      if (json) err.details.json = json;
      throw err;
    }

    return json || { deleted: true, id };
  }

  /**
   * Delete all uploaded files (deduped), best-effort.
   */
  async delete_uploaded_files(file_ids = []) {
    const unique_ids = Array.from(new Set((file_ids || []).filter(Boolean).map((v) => String(v).trim()))).filter(Boolean);
    if (unique_ids.length === 0) return;

    const results = await Promise.allSettled(
      unique_ids.map(async (id) => await this.delete_file_from_xai(id))
    );

    // Do not throw; cleanup should not break caller.
    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      console.warn('xAI cleanup: some file deletions failed:', rejected.map((r) => r.reason));
    }
  }
}


/**
 * Request adapter for xAI Chat Completions.
 * Converts internal SmartChat OpenAI-ish request into the xAI ChatRequest shape.
 *
 * Primary job: convert file parts into xAI "input_file" parts with file_id.
 *
 * xAI OpenAPI defines file inputs as:
 *   { "type": "input_file", "file_id": "...", ... } :contentReference[oaicite:4]{index=4}
 */
export class XaiCompletionRequestAdapter extends SmartChatModelRequestAdapter {
  /**
   * Convert request to xAI format
   * @param {boolean} streaming
   * @returns {Object} Request params
   */
  to_platform(streaming = false) {
    return this.to_xai(streaming);
  }

  /**
   * xAI is largely OpenAI-compatible for /v1/chat/completions,
   * but file parts must be shaped as "input_file".
   * @param {boolean} streaming
   * @returns {Object} Request params
   */
  to_xai(streaming = false) {
    const req = super.to_openai(streaming);
    let body = {};
    try {
      body = JSON.parse(req.body || '{}');
    } catch {
      body = {};
    }

    body.messages = (body.messages || []).map((message) => {
      return this._transform_message_for_xai(message);
    });

    req.body = JSON.stringify(body);
    return req;
  }

  _transform_message_for_xai(message = {}) {
    if (!message || typeof message !== 'object') return message;

    // If content is a string, leave it alone
    if (!Array.isArray(message.content)) return message;

    const content = message.content.map((part) => this._transform_content_part_for_xai(part));
    return {
      ...message,
      content
    };
  }

  _transform_content_part_for_xai(part) {
    if (!part || typeof part !== 'object') return part;

    // Normalize image_url shape (string -> {url})
    if (part.type === 'image_url') {
      const image_url = part.image_url;
      if (typeof image_url === 'string') {
        return { ...part, image_url: { url: image_url } };
      }
      return part;
    }

    // Convert internal canonical file part -> xAI "input_file"
    // Internal canonical after upload is typically:
    //   { type:'file', file:{ file_id:'...' } }
    if (part.type === 'file') {
      const file = part.file || {};
      const file_id = file.file_id || file.id || part.file_id || part.id;
      if (typeof file_id === 'string' && file_id.length > 0) {
        return {
          type: 'input_file',
          file_id
        };
      }
      return part;
    }

    // If caller already used input_file, pass through (but ensure file_id present)
    if (part.type === 'input_file') {
      if (typeof part.file_id === 'string' && part.file_id.length > 0) return part;

      const file_id = part.file?.file_id || part.file?.id || part.id;
      if (typeof file_id === 'string' && file_id.length > 0) {
        return {
          type: 'input_file',
          file_id
        };
      }
      return part;
    }

    return part;
  }
}

/**
 * Response adapter for xAI Chat Completions.
 * Ensures we always return an OpenAI-like response object with:
 *   id, object, created, model, choices, usage
 *
 * xAI /v1/chat/completions is OpenAI-like but may include fields like `refusal`, `citations`, etc.
 * We keep the full raw response in `raw` for debugging.
 */
export class XaiCompletionResponseAdapter extends SmartChatModelResponseAdapter {
  static get platform_res() {
    return {
      id: '',
      object: 'chat.completion',
      created: 0,
      model: '',
      choices: [],
      usage: {}
    };
  }

  /**
   * Convert response to OpenAI-like format.
   * @returns {Object}
   */
  to_openai() {
    if (this.error) return { error: normalize_error(this.error, this.status) };

    const object = this._normalize_object_type(this._res.object);

    return {
      id: this._res.id || `xai_${Date.now()}`,
      object: object || 'chat.completion',
      created: this._res.created || Math.floor(Date.now() / 1000),
      model: this._res.model || this.adapter?.model_key || '',
      choices: this._transform_choices_to_openai(),
      usage: this._transform_usage_to_openai(),
      raw: this._res
    };
  }

  _normalize_object_type(object_value) {
    if (typeof object_value !== 'string') return object_value;
    // Streaming chunks often use "chat.completion.chunk"
    if (object_value.endsWith('.chunk')) return object_value.replace('.chunk', '');
    return object_value;
  }

  _transform_usage_to_openai() {
    if (!this._res.usage) {
      return {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
    }
    return this._res.usage;
  }

  /**
   * Streaming chunk handler.
   * xAI streams data lines in OpenAI-like SSE form:
   *   "data: {...json...}"
   * and ends with:
   *   "data: [DONE]"
   */
  handle_chunk(chunk) {
    if (chunk === 'data: [DONE]') return;

    const json_text = String(chunk || '').startsWith('data: ')
      ? String(chunk).slice(6)
      : String(chunk);

    let parsed;
    try {
      parsed = JSON.parse(json_text);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    // Preserve top-level metadata as it arrives
    if (!this._res.id && parsed.id) this._res.id = parsed.id;
    if (parsed.model) this._res.model = parsed.model;
    if (parsed.created) this._res.created = parsed.created;
    if (parsed.object) this._res.object = parsed.object;
    if (parsed.usage) this._res.usage = parsed.usage;

    if (!Array.isArray(this._res.choices)) this._res.choices = [];
    if (!this._res.choices[0]) {
      this._res.choices[0] = {
        index: 0,
        message: {
          role: 'assistant',
          content: ''
        }
      };
    }

    const delta = parsed.choices?.[0]?.delta;
    if (!delta || typeof delta !== 'object') return;

    if (delta.role) {
      this._res.choices[0].message.role = delta.role;
    }

    let raw;
    if (typeof delta.content === 'string') {
      raw = delta.content;
      this._res.choices[0].message.content += delta.content;
    }

    if (Array.isArray(delta.tool_calls)) {
      if (!Array.isArray(this._res.choices[0].message.tool_calls)) {
        this._res.choices[0].message.tool_calls = [{
          id: '',
          type: 'function',
          function: { name: '', arguments: '' }
        }];
      }

      const incoming = delta.tool_calls[0] || {};
      const target = this._res.choices[0].message.tool_calls[0];

      if (incoming.id) target.id += incoming.id;
      if (incoming.function?.name) target.function.name += incoming.function.name;
      if (incoming.function?.arguments) target.function.arguments += incoming.function.arguments;
    }

    // finish reason sometimes appears on parsed.choices[0].finish_reason in chunk streams
    const finish_reason = parsed.choices?.[0]?.finish_reason;
    if (finish_reason) {
      this._res.choices[0].finish_reason = finish_reason;
    }

    return raw;
  }
}