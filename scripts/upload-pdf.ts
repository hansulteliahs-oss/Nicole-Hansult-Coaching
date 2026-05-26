// Run once: npx tsx scripts/upload-pdf.ts
// Uploads placeholder PDF to Vercel Blob (public, opaque URL)
// Copy the printed URL → set as BLOB_PDF_URL in .env.local + Vercel
import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const pdfPath = join(process.cwd(), 'docs', 'placeholder.pdf');
const fileBuffer = readFileSync(pdfPath);

const blob = await put('guides/look-and-feel-good-naked.pdf', fileBuffer, {
  access: 'public',
  addRandomSuffix: true,
  contentType: 'application/pdf',
});

console.log('\nBlob uploaded successfully.');
console.log('BLOB_PDF_URL =', blob.url);
console.log('\nAdd this to .env.local and Vercel Environment Variables.\n');
