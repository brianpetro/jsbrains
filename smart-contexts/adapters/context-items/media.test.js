import test from 'ava';
import { ImageContextItemAdapter } from './image.js';
import { PdfContextItemAdapter } from './pdf.js';

for (const [adapter_class, source_path, mime_type, media_type] of [
  [ImageContextItemAdapter, 'Images/original.PNG', 'image/png', 'image_url'],
  [ImageContextItemAdapter, 'Images/original.jpg', 'image/jpg', 'image_url'],
  [ImageContextItemAdapter, 'Images/original.svg', 'image/svg', 'image_url'],
  [PdfContextItemAdapter, 'Documents/original.PDF', 'application/pdf', 'pdf_url'],
]) {
  test(`media adapter preserves source paths, bytes and existing MIME metadata: ${source_path}`, async t => {
    const calls = [];
    const bytes = new Uint8Array([0, 128, 255]).buffer;
    const item = {
      key: 'alias.data', data: { source_path },
      env: { fs: {
        async read_binary(path) { calls.push(['binary', path]); return bytes; },
        async read(path, encoding) { calls.push([encoding, path]); return 'AID/'; },
      } },
    };
    const adapter = new adapter_class(item);
    t.is(adapter.mime_type, mime_type);
    t.is(await adapter.get_binary(), bytes);
    t.deepEqual(calls, [['binary', source_path]]);
    t.deepEqual(await adapter.get_base64(), {
      type: media_type,
      key: item.key,
      name: source_path.split('/').pop(),
      url: `data:${mime_type};base64,AID/`,
    });
    t.deepEqual(calls, [['binary', source_path], ['base64', source_path]]);
  });
}

for (const adapter_class of [ImageContextItemAdapter, PdfContextItemAdapter]) {
  test(`${adapter_class.name} binary reads preserve filesystem results and thrown errors`, async t => {
    const item = { key: 'original.png', env: { fs: {} } };
    const adapter = new adapter_class(item);
    for (const result of [
      new Uint8Array([99, 0, 128, 255, 88]).subarray(1, 4),
      Buffer.from([99, 0, 128, 255, 88]).subarray(1, 4),
      new ArrayBuffer(0), null, { error: 'Read failed' },
    ]) {
      item.env.fs.read_binary = async path => { t.is(path, item.key); return result; };
      t.is(await adapter.get_binary(), result);
    }
    const error = new Error('Read threw');
    item.env.fs.read_binary = async () => { throw error; };
    await t.throwsAsync(() => adapter.get_binary(), { is: error });
  });
}
