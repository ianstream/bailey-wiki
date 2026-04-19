import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGS, LANG_PROMPTS } from '../../src/config/languages.js';

describe('SUPPORTED_LANGS', () => {
  test('contains exactly 5 languages', () => {
    assert.equal(SUPPORTED_LANGS.length, 5);
  });

  test('includes all expected language codes', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh', 'es']) {
      assert.ok(SUPPORTED_LANGS.includes(lang as never), `Missing lang: ${lang}`);
    }
  });
});

describe('LANG_PROMPTS', () => {
  const REQUIRED_KEYS = [
    'langRule', 'titleHint', 'overviewHint', 'responsibilitiesHint',
    'logicHint', 'openQuestionsHint', 'relatedNote', 'descRule', 'unimplemented',
  ] as const;

  test('each language has all required fields', () => {
    for (const lang of SUPPORTED_LANGS) {
      const lp = LANG_PROMPTS[lang];
      for (const key of REQUIRED_KEYS) {
        assert.ok(key in lp, `${lang} missing key: ${key}`);
      }
    }
  });

  test('langRule is an array with at least 1 item', () => {
    for (const lang of SUPPORTED_LANGS) {
      assert.ok(Array.isArray(LANG_PROMPTS[lang].langRule), `${lang}.langRule should be array`);
      assert.ok(LANG_PROMPTS[lang].langRule.length >= 1, `${lang}.langRule should have at least 1 item`);
    }
  });
});
