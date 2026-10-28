#!/usr/bin/env node
'use strict';

// Stage exactly the public inventory for static hosting, including Git-based Vercel builds.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
for (const script of ['build-agent-resources.cjs', 'test-agent-resources.cjs']) {
  execFileSync(process.execPath, [path.join(__dirname, script)], { cwd: root, stdio: 'inherit' });
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'agent-manifest.json'), 'utf8'));
const files = ['agent-manifest.json', ...manifest.files.map(file => file.path), ...manifest.archives.map(file => file.path)];
for (const file of files) {
  if (path.isAbsolute(file) || file.includes('\\') || file.split('/').some(part => !part || part.startsWith('.'))) {
    throw new Error(`Unsafe public path: ${file}`);
  }
}
fs.rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}
console.log(`Staged ${files.length} public files in dist/.`);
