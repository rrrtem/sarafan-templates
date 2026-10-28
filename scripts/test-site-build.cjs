#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
assert(fs.existsSync(path.join(output, 'agent-manifest.json')), 'Site build must publish its resource manifest');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'agent-manifest.json'), 'utf8'));
const records = [...manifest.files, ...manifest.archives];
for (const entry of records) {
  const bytes = fs.readFileSync(path.join(output, entry.path));
  assert.equal(bytes.length, entry.bytes, `Published size: ${entry.path}`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, `Published hash: ${entry.path}`);
}
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [path.relative(output, file).split(path.sep).join('/')];
  });
}
assert.deepEqual(walk(output).sort(), ['agent-manifest.json', ...records.map(record => record.path)].sort(),
  'Only the public resource inventory is deployed; no Git metadata, environment files, plans or stale full archives');
console.log(`PASS: ${records.length + 1} published files match their hashes; deployment contains only public resources.`);
