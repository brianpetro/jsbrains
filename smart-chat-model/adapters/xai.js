// external:../jsbrains/smart-chat-model/adapters/xai.js
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
    signup_url: 'https://ide.x.ai',
  };

  /** Grok is OpenAI-compatible → reuse the stock adapters */
  get req_adapter () { return SmartChatModelRequestAdapter; }
  get res_adapter () { return SmartChatModelResponseAdapter; }

  /* ------------------------------------------------------------------ *
   *  Model-list helpers
   * ------------------------------------------------------------------ */

  /**
   * The Grok `/v1/models` route is **GET**, not POST.
   * Override the HTTP verb so `get_models()` works.
   * @returns {string} 'GET'
   */
  get models_endpoint_method () { return 'GET'; }

  /**
   * Parse `/v1/models` payload to the canonical shape used by SmartChat.
   *
   * Grok returns:
   * ```json
   * { "object":"list",
   *   "data":[{ "id":"grok-3-beta", "context_length":128000, …}] }
   * ```
   */
  parse_model_data (model_data = {}) {
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

  get files_endpoint() {
    try {
      const origin = new URL(this.endpoint).origin;
      return `${origin}/v1/files`;
    } catch {
      return 'https://api.x.ai/v1/files';
    }
  }

  async complete(req) {
    try {
      const prepared_req = await this.prepare_req_with_uploaded_files(req);
      return await super.complete(prepared_req);
    } catch (error) {
      return { error: normalize_error(error?.data || error) };
    }
  }

  async stream(req, handlers = {}) {
    try {
      const prepared_req = await this.prepare_req_with_uploaded_files(req);
      return await super.stream(prepared_req, handlers);
    } catch (error) {
      const normalized = normalize_error(error?.data || error);
      if (typeof handlers?.error === 'function') handlers.error(normalized);
      throw normalized;
    }
  }

  async prepare_req_with_uploaded_files(req = {}) {
    if (!req || !Array.isArray(req.messages) || req.messages.length === 0) return req;

    const needs_upload = req.messages.some((m) => this.message_has_inline_file(m));
    if (!needs_upload) return req;

    const messages = await Promise.all(
      req.messages.map(async (message) => await this.transform_message_for_xai(message))
    );

    return {
      ...req,
      messages
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

  async transform_message_for_xai(message = {}) {
    if (!Array.isArray(message.content)) return message;

    const content = await Promise.all(
      message.content.map(async (part) => await this.transform_content_part_for_xai(part))
    );

    return {
      ...message,
      content
    };
  }

  async transform_content_part_for_xai(part) {
    if (!part || typeof part !== 'object') return part;

    if (part.type === 'image_url') {
      return this.normalize_image_part(part);
    }

    if (part.type === 'file') {
      return await this.normalize_or_upload_file_part(part);
    }

    if (part.type === 'input_file') {
      return await this.normalize_or_upload_input_file_part(part);
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

  async normalize_or_upload_file_part(part = {}) {
    const file = part.file || {};
    const existing_file_id = file.file_id || file.id || part.file_id || part.id;

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

    return {
      type: 'file',
      file: { file_id }
    };
  }

  async normalize_or_upload_input_file_part(part = {}) {
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
   * This MUST be multipart/form-data:
   *   - form field: "file"
   *   - form field: "purpose" (commonly "assistants")
   * and MUST NOT manually set Content-Type (boundary must be auto-generated).
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
      // DO NOT set Content-Type here (boundary must be added automatically)
      'Authorization': `Bearer ${this.api_key}`
    };

    let resp;
    try {
      if (typeof fetch === 'function') {
        resp = await fetch(this.files_endpoint, {
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

      // Fallback: use SmartHttpRequest if fetch is unavailable
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
    } catch (error) {
      throw error;
    }
  }
}
