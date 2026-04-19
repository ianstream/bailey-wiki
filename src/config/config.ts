import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deepMerge } from '../utils/deep-merge.js';
import { ensureDir } from '../utils/fs.js';
import { SUPPORTED_LANGS } from './languages.js';
import type { BaileyWikiConfig, ConfigOverrides } from '../types.js';

function settingDirPath(projectPath: string, wikiDir: string): string {
  return path.join(projectPath, wikiDir, '.setting');
}

export async function loadConfig(
  projectPath: string,
  overrides: ConfigOverrides = {}
): Promise<BaileyWikiConfig> {
  const wikiDir = overrides.wikiDir ?? 'wiki';
  const settingConfigPath = path.join(settingDirPath(projectPath, wikiDir), 'config.json');

  // Migrate legacy configs
  const legacyPaths = [
    path.join(projectPath, wikiDir, 'bailey-wiki.config.json'),
    path.join(projectPath, 'bailey-wiki.config.json'),
  ];
  for (const legacyPath of legacyPaths) {
    try {
      const legacyCfg = await fs.readFile(legacyPath, 'utf-8');
      await ensureDir(path.dirname(settingConfigPath));
      let existing: Record<string, unknown> = {};
      try { existing = JSON.parse(await fs.readFile(settingConfigPath, 'utf-8')); } catch {}
      const merged = deepMerge(existing, JSON.parse(legacyCfg) as Record<string, unknown>);
      await fs.writeFile(settingConfigPath, JSON.stringify(merged, null, 2), 'utf-8');
      await fs.unlink(legacyPath);
    } catch {}
  }

  let fileConfig: Record<string, unknown> = {};
  try {
    fileConfig = JSON.parse(await fs.readFile(settingConfigPath, 'utf-8'));
  } catch {}

  let customPrompt = '';
  try {
    customPrompt = await fs.readFile(
      path.join(projectPath, wikiDir, '.setting', 'prompt.md'), 'utf-8'
    );
  } catch {}

  const fc = fileConfig as Record<string, unknown>;
  const fcLlm = fc['llm'] as Record<string, unknown> | undefined;
  const fcLlmBedrock = fcLlm?.['bedrock'] as Record<string, unknown> | undefined;
  const fcSources = fc['sources'] as Record<string, unknown> | undefined;
  const fcWiki = fc['wiki'] as Record<string, unknown> | undefined;

  const rawLang = overrides.language ?? process.env['BAILEY_WIKI_LANG'] ?? (fc['language'] as string | undefined) ?? 'ko';
  const language = SUPPORTED_LANGS.includes(rawLang as BaileyWikiConfig['language'])
    ? rawLang as BaileyWikiConfig['language']
    : 'ko';

  return {
    project: overrides.project ?? (fc['project'] as string | undefined) ?? projectPath,
    customPrompt,
    language,
    llm: {
      model: overrides.model ?? process.env['BAILEY_WIKI_MODEL'] ?? (fcLlm?.['model'] as string | undefined) ?? 'apac.amazon.nova-lite-v1:0',
      bedrock: {
        profile: overrides.profile ?? process.env['BAILEY_WIKI_AWS_PROFILE'] ?? (fcLlmBedrock?.['profile'] as string | undefined) ?? 'default',
        region: overrides.region ?? process.env['BAILEY_WIKI_AWS_REGION'] ?? (fcLlmBedrock?.['region'] as string | undefined) ?? 'ap-northeast-2',
      },
    },
    sources: {
      include: (fcSources?.['include'] as string[] | undefined) ?? ['src', 'core/src/main', 'common/src/main'],
      exclude: (fcSources?.['exclude'] as string[] | undefined) ?? [
        '**/test/**', '**/tests/**', '**/__tests__/**',
        '**/*.test.ts', '**/*.test.kt', '**/*.spec.ts',
        '**/node_modules/**', '**/build/**', '**/dist/**',
        '**/.gradle/**', '**/.next/**',
      ],
      extensions: (fcSources?.['extensions'] as string[] | undefined) ?? ['.kt', '.java', '.ts', '.tsx', '.js'],
    },
    wiki: {
      dir: (fcWiki?.['dir'] as string | undefined) ?? 'wiki',
      obsidian: fcWiki?.['obsidian'] !== false,
    },
    concurrency: overrides.concurrency ?? (parseInt(process.env['BAILEY_WIKI_CONCURRENCY'] ?? '0') || os.cpus().length),
  };
}

export async function saveSettings(config: BaileyWikiConfig): Promise<void> {
  const sDir = settingDirPath(config.project, config.wiki.dir);
  await ensureDir(sDir);
  const settings = {
    language: config.language,
    llm: { model: config.llm.model, bedrock: config.llm.bedrock },
    sources: config.sources,
    wiki: config.wiki,
    concurrency: config.concurrency,
  };
  await fs.writeFile(path.join(sDir, 'config.json'), JSON.stringify(settings, null, 2), 'utf-8');
}
