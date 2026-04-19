import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function extractFrontmatterPath(content: string): string | null {
  const match = content.match(/^path:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

describe('lint — stale path detection', () => {
  test('extracts path from frontmatter', () => {
    const content = `---
type: source
path: src/main/com/example/Foo.kt
title: Foo
---`;
    assert.equal(extractFrontmatterPath(content), 'src/main/com/example/Foo.kt');
  });

  test('returns null when no path field', () => {
    const content = `---
type: source
title: Foo
---`;
    assert.equal(extractFrontmatterPath(content), null);
  });

  test('handles path with spaces trimmed', () => {
    const content = `path:   src/main/Foo.kt  `;
    assert.equal(extractFrontmatterPath(content), 'src/main/Foo.kt');
  });
});
