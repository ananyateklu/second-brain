import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source path of the PDF.js worker file
const workerSrc = join(
  __dirname,
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.min.js'
);

// Destination path in the public directory
const workerDest = join(__dirname, 'public', 'pdf.worker.min.js');

try {
  // Create public directory if it doesn't exist
  try {
    await fs.access(join(__dirname, 'public'));
  } catch {
    await fs.mkdir(join(__dirname, 'public'));
  }

  // Copy the worker file
  await fs.copyFile(workerSrc, workerDest);
  console.log('PDF.js worker file copied successfully!');
} catch (error) {
  console.error('Error copying PDF.js worker file:', error);
} 