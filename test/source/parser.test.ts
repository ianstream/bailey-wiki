import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseImports } from '../../src/source/parser.js';

describe('parseImports — Kotlin/Java', () => {
  test('parses kotlin imports', () => {
    const content = `
import com.example.service.PaymentService
import com.example.repository.OrderRepository
import kotlin.collections.List
`;
    const result = parseImports(content, '.kt');
    assert.ok(result.includes('PaymentService'));
    assert.ok(result.includes('OrderRepository'));
    assert.ok(result.includes('List'));
  });

  test('parses java imports', () => {
    const content = `
import java.util.List;
import com.example.UserService;
`;
    const result = parseImports(content, '.java');
    assert.ok(result.includes('List'));
    assert.ok(result.includes('UserService'));
  });

  test('returns empty for no imports', () => {
    const result = parseImports('class Foo {}', '.kt');
    assert.equal(result.length, 0);
  });
});

describe('parseImports — TypeScript/JavaScript', () => {
  test('parses relative imports', () => {
    const content = `
import { CartService } from './CartService';
import type { User } from '../types/User';
import axios from 'axios';
`;
    const result = parseImports(content, '.ts');
    assert.ok(result.includes('CartService'));
    assert.ok(result.includes('User'));
    assert.ok(!result.includes('axios')); // non-relative skipped
  });

  test('skips index imports', () => {
    const content = `import { foo } from './utils/index';`;
    const result = parseImports(content, '.ts');
    assert.ok(!result.includes('index'));
  });

  test('parses tsx imports', () => {
    const content = `import Button from './components/Button';`;
    const result = parseImports(content, '.tsx');
    assert.ok(result.includes('Button'));
  });

  test('parses js imports', () => {
    const content = `import { helper } from './helpers/helper';`;
    const result = parseImports(content, '.js');
    assert.ok(result.includes('helper'));
  });

  test('skips node_modules imports', () => {
    const content = `import React from 'react';`;
    const result = parseImports(content, '.tsx');
    assert.equal(result.length, 0);
  });

  test('no duplicates', () => {
    const content = `
import { Foo } from './Foo';
import type { Foo } from './Foo';
`;
    const result = parseImports(content, '.ts');
    assert.equal(result.filter(r => r === 'Foo').length, 1);
  });
});
