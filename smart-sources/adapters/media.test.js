import test from 'ava';
import { Buffer } from 'node:buffer';
import { MediaSourceContentAdapter } from './media.js';

const create_adapter = t => new MediaSourceContentAdapter({
  data: {},
  env: { settings: { smart_sources: {} } },
  collection: {
    fs: {
      read: async (path, encoding) => {
        t.is(path, 'image.png');
        t.is(encoding, 'base64');
        return Buffer.from('hi').toString('base64');
      }
    }
  },
  file: { name: 'image.png', stat: {} },
  file_path: 'image.png'
});

test('read returns base64 media object', async t => {
  const adapter = create_adapter(t);
  const result = await adapter.read();
  t.deepEqual(result, {
    name: 'image.png',
    mime_type: 'image/png',
    content: Buffer.from('hi').toString('base64')
  });
});
