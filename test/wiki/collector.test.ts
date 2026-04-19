import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chunkWikiFiles } from '../../src/wiki/collector.js';

describe('chunkWikiFiles', () => {
  test('single chunk for small input', () => {
    const files = Array.from({ length: 10 }, (_, i) => `wiki/file${i}.md`);
    const chunks = chunkWikiFiles(files);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 10);
  });

  test('splits into multiple chunks', () => {
    // 400 tokens per file, 70000 max → splits at 175 files
    const files = Array.from({ length: 250 }, (_, i) => `wiki/file${i}.md`);
    const chunks = chunkWikiFiles(files);
    assert.ok(chunks.length >= 2);
    assert.equal(chunks.flat().length, 250); // no files lost
  });

  test('custom chunk size', () => {
    const files = Array.from({ length: 10 }, (_, i) => `wiki/file${i}.md`);
    // 400 tokens per file, 2000 max → splits at 5 files
    const chunks = chunkWikiFiles(files, 2000);
    assert.equal(chunks.length, 2);
  });

  test('empty input', () => {
    const chunks = chunkWikiFiles([]);
    assert.equal(chunks.length, 0);
  });

  test('preserves all files across chunks', () => {
    const files = Array.from({ length: 500 }, (_, i) => `wiki/file${i}.md`);
    const chunks = chunkWikiFiles(files);
    const allFiles = chunks.flat();
    assert.equal(allFiles.length, 500);
    assert.deepEqual(allFiles, files);
  });
});
