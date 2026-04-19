import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sourceToWikiPath } from '../../src/source/collector.js';

describe('sourceToWikiPath', () => {
  const project = '/home/user/my-project';
  const wikiDir = 'wiki';

  test('kotlin file', () => {
    const src = '/home/user/my-project/src/main/com/example/Foo.kt';
    const expected = '/home/user/my-project/wiki/src/main/com/example/Foo.md';
    assert.equal(sourceToWikiPath(src, project, wikiDir), expected);
  });

  test('typescript file', () => {
    const src = '/home/user/my-project/src/components/Button.tsx';
    const expected = '/home/user/my-project/wiki/src/components/Button.md';
    assert.equal(sourceToWikiPath(src, project, wikiDir), expected);
  });

  test('java file', () => {
    const src = '/home/user/my-project/src/main/java/com/example/Service.java';
    const expected = '/home/user/my-project/wiki/src/main/java/com/example/Service.md';
    assert.equal(sourceToWikiPath(src, project, wikiDir), expected);
  });

  test('custom wiki dir', () => {
    const src = '/home/user/my-project/src/Foo.ts';
    const expected = '/home/user/my-project/docs/src/Foo.md';
    assert.equal(sourceToWikiPath(src, project, 'docs'), expected);
  });
});
