import test from 'ava';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { insert_pdf } from './insert_pdf.js';

test('insert_pdf appends pdf file to last user message', async t => {
  await mkdir('test/test-content', { recursive: true });
  const pdfPath = 'sample.pdf';
  const filePath = `test/test-content/${pdfPath}`;
  const minimalPdf = '%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
  await writeFile(filePath, minimalPdf);

  const request = { messages: [{ role: 'user', content: [] }] };
  const fs = { read: (p, enc) => readFile(`test/test-content/${p}`, { encoding: enc }) };

  await insert_pdf(request, pdfPath, fs);

  const msg = request.messages[0];
  t.is(msg.content[0].type, 'file');
  t.is(msg.content[0].file.filename, pdfPath);
  t.true(msg.content[0].file.file_data.startsWith('data:application/pdf;base64,'));
});
