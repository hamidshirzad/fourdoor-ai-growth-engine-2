import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendNextDir = path.join(__dirname, 'frontend', '.next');
const rootNextDir = path.join(__dirname, '.next');
const rootDistDir = path.join(__dirname, 'dist');

if (!fs.existsSync(frontendNextDir)) {
  console.error('Error: frontend/.next does not exist after build!');
  process.exit(1);
}

function copyDirExcept(src, dest, ignoreNames = ['cache', 'dev', 'diagnostics']) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(src);
  for (const item of items) {
    if (ignoreNames.includes(item)) continue;
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirExcept(srcPath, destPath, ignoreNames);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Syncing Next.js build output to .next and dist...');

// Clean and recreate root .next and dist
fs.rmSync(rootNextDir, { recursive: true, force: true });
fs.rmSync(rootDistDir, { recursive: true, force: true });

// Copy frontend/.next to root .next and dist (excluding heavy cache/dev/diagnostics)
copyDirExcept(frontendNextDir, rootNextDir);
copyDirExcept(frontendNextDir, rootDistDir);

// Copy static assets to dist/_next/static and dist/static
const staticSrc = path.join(frontendNextDir, 'static');
if (fs.existsSync(staticSrc)) {
  copyDirExcept(staticSrc, path.join(rootDistDir, '_next', 'static'));
  copyDirExcept(staticSrc, path.join(rootDistDir, 'static'));
}

// Copy pre-rendered HTML files from server/pages to dist root
const pagesSrc = path.join(frontendNextDir, 'server', 'pages');
if (fs.existsSync(pagesSrc)) {
  const copyHtmlFiles = (srcDir, destDir) => {
    const items = fs.readdirSync(srcDir);
    for (const item of items) {
      const fullSrc = path.join(srcDir, item);
      const stat = fs.statSync(fullSrc);
      if (stat.isDirectory()) {
        if (!['_app', '_document', '_error', 'api'].includes(item)) {
          copyHtmlFiles(fullSrc, path.join(destDir, item));
        }
      } else if (item.endsWith('.html')) {
        const destPath = path.join(destDir, item);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(fullSrc, destPath);
      }
    }
  };
  copyHtmlFiles(pagesSrc, rootDistDir);
}

// Copy root configuration and entry files into dist
['server.js', 'package.json', 'metadata.json'].forEach((file) => {
  const srcFile = path.join(__dirname, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(rootDistDir, file));
  }
});

console.log('Build output successfully synced to .next and dist!');
