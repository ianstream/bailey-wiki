import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanLLMResponse, syncRelatedFromDependencies } from '../../src/wiki/processor.js';

describe('cleanLLMResponse', () => {
  test('strips ```markdown wrapper', () => {
    const input = '```markdown\n# Title\ncontent\n```';
    const result = cleanLLMResponse(input);
    assert.ok(!result.includes('```markdown'));
    assert.ok(result.includes('# Title'));
  });

  test('unwraps ```yaml frontmatter', () => {
    const input = '```yaml\n---\ntype: source\n---\n```\n# Content';
    const result = cleanLLMResponse(input);
    assert.ok(!result.includes('```yaml'));
    assert.ok(result.startsWith('---'));
  });

  test('fixes unclosed code fences (odd count)', () => {
    const input = '---\ntype: source\n---\n```typescript\nconst x = 1;\n';
    const result = cleanLLMResponse(input);
    const fenceCount = (result.match(/^```/gm) ?? []).length;
    assert.equal(fenceCount % 2, 0);
  });

  test('no-op on clean input', () => {
    const input = '---\ntype: source\n---\n# Overview\nContent here.';
    const result = cleanLLMResponse(input);
    assert.equal(result, input);
  });

  test('flattens nested related array', () => {
    const input = '---\nrelated: [["Foo"]]\n---\n# Content';
    const result = cleanLLMResponse(input);
    assert.ok(!result.includes('[[\"'));
  });

  test('removes wikilinks from related field', () => {
    const input = '---\nrelated: [[[db, [[types, [[theme]\n---\n# Content';
    const result = cleanLLMResponse(input);
    assert.ok(!result.includes('[['), `wikilinks should be removed, got: ${result}`);
    assert.ok(result.includes('related: [db, types, theme]'), `expected plain names, got: ${result}`);
  });

  test('removes [[Name]] wikilinks from related field', () => {
    const input = '---\nrelated: [[[OrderService]], [[UserService]]]\n---\n# Content';
    const result = cleanLLMResponse(input);
    assert.ok(!result.includes('[['));
    assert.ok(result.includes('OrderService'));
    assert.ok(result.includes('UserService'));
  });
});

describe('syncRelatedFromDependencies', () => {
  test('extracts wikilinks from Korean Dependencies section into related field', () => {
    const input = [
      '---',
      'type: source',
      'related: []',
      '---',
      '',
      '## 의존성',
      '',
      '- [[UserService]] — 사용자 서비스',
      '- [[OrderRepository]] — 주문 레포지토리',
    ].join('\n');
    const result = syncRelatedFromDependencies(input);
    assert.ok(result.includes('related: [UserService, OrderRepository]'), `got: ${result}`);
  });

  test('extracts wikilinks from English Dependencies section', () => {
    const input = [
      '---',
      'related: []',
      '---',
      '## Dependencies',
      '- [[PaymentService]]',
    ].join('\n');
    const result = syncRelatedFromDependencies(input);
    assert.ok(result.includes('related: [PaymentService]'), `got: ${result}`);
  });

  test('no-op when no wikilinks in Dependencies section', () => {
    const input = [
      '---',
      'related: []',
      '---',
      '## 의존성',
      '없음',
    ].join('\n');
    const result = syncRelatedFromDependencies(input);
    assert.ok(result.includes('related: []'));
  });

  test('no-op when no Dependencies section exists', () => {
    const input = [
      '---',
      'related: []',
      '---',
      '## 개요',
      '내용',
    ].join('\n');
    const result = syncRelatedFromDependencies(input);
    assert.equal(result, input);
  });

  test('deduplicates wikilinks', () => {
    const input = [
      '---',
      'related: []',
      '---',
      '## Dependencies',
      '- [[Foo]]',
      '- [[Foo]]',
      '- [[Bar]]',
    ].join('\n');
    const result = syncRelatedFromDependencies(input);
    assert.ok(result.includes('related: [Foo, Bar]'), `got: ${result}`);
    assert.equal((result.match(/Foo/g) ?? []).length, 3); // one in related, two in deps
  });
});
