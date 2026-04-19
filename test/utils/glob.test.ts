import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchesGlob } from '../../src/utils/glob.js';

describe('matchesGlob', () => {
  test('matches **/ prefix pattern', () => {
    assert.ok(matchesGlob('src/test/Foo.kt', ['**/test/**']));
  });

  test('matches exact extension pattern', () => {
    assert.ok(matchesGlob('src/Foo.test.ts', ['**/*.test.ts']));
  });

  test('does not match unrelated path', () => {
    assert.ok(!matchesGlob('src/main/Foo.kt', ['**/test/**']));
  });

  test('matches node_modules (nested)', () => {
    assert.ok(matchesGlob('src/node_modules/lodash/index.js', ['**/node_modules/**']));
  });

  test('matches build directory', () => {
    assert.ok(matchesGlob('core/build/classes/Foo.class', ['**/build/**']));
  });

  test('does not match partial directory name', () => {
    assert.ok(!matchesGlob('src/main/BuildHelper.kt', ['**/build/**']));
  });

  test('matches .gradle', () => {
    assert.ok(matchesGlob('project/.gradle/caches/foo', ['**/.gradle/**']));
  });

  test('multiple patterns — matches any', () => {
    assert.ok(matchesGlob('src/test/Foo.kt', ['**/node_modules/**', '**/test/**']));
  });

  test('multiple patterns — no match', () => {
    assert.ok(!matchesGlob('src/main/Foo.kt', ['**/node_modules/**', '**/test/**']));
  });
});
