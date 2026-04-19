import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// wikilink extraction helper (테스트용 인라인 — backlinks.ts의 동일 regex)
function extractWikilinks(content: string): string[] {
  return [...content.matchAll(/\[\[([^\]|]+)\]\]/g)].map(m => m[1].trim());
}

describe('backlink wikilink extraction', () => {
  test('extracts simple wikilinks', () => {
    const content = 'See [[PaymentService]] and [[OrderRepository]]';
    const links = extractWikilinks(content);
    assert.deepEqual(links, ['PaymentService', 'OrderRepository']);
  });

  test('pipe alias — not matched (known limitation)', () => {
    // [[Name|alias]] is not matched by current regex — known limitation
    // Use [[Name]] format to ensure wikilinks are indexed
    const content = 'See [[PaymentService|결제 서비스]]';
    const links = extractWikilinks(content);
    assert.equal(links.length, 0); // pipe alias causes no match
  });

  test('no wikilinks', () => {
    const content = 'No links here.';
    assert.equal(extractWikilinks(content).length, 0);
  });

  test('multiple wikilinks in one line', () => {
    const content = '[[A]], [[B]], [[C]]';
    assert.equal(extractWikilinks(content).length, 3);
  });
});
