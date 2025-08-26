import test from 'ava';
import { Buffer } from 'node:buffer';
import { MediaSourceContentAdapter, infer_mime_type, is_media_key } from './media.js';

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

test('is_media_key detects media extensions', t => {
  t.true(is_media_key('photo.JPG'));
  t.true(is_media_key('sound.MP3'));
  t.false(is_media_key('note.txt'));
});

test('detect_type delegates to is_media_key', t => {
  t.true(MediaSourceContentAdapter.detect_type({ key: 'video.webm' }));
  t.false(MediaSourceContentAdapter.detect_type({ key: 'doc.md' }));
});

test('infer_mime_type resolves audio types', t => {
  t.is(infer_mime_type('track.mp3'), 'audio/mpeg');
  t.is(infer_mime_type('clip.wav'), 'audio/wav');
});
