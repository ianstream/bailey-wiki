import fs from 'node:fs/promises';
import path from 'node:path';
import { collectSourceFiles } from '../source/collector.js';
import { loadState } from '../state/state.js';
import { settingDir } from '../state/state.js';
import { getHeadCommit, getChangedFiles } from '../state/git.js';
import { C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdStatus(config: BaileyWikiConfig): Promise<void> {
  const state = await loadState(config);
  const files = await collectSourceFiles(config);
  const wikiDir = path.join(config.project, config.wiki.dir);

  const wikiFiles = await (async () => {
    try {
      const all: string[] = [];
      async function walk(d: string): Promise<void> {
        const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
          if (e.isDirectory()) await walk(path.join(d, e.name));
          else if (e.name.endsWith('.md')) all.push(e.name);
        }
      }
      await walk(wikiDir);
      return all;
    } catch {
      return [];
    }
  })();

  const headCommit = getHeadCommit(config.project);

  let savedSettings: Record<string, unknown> | null = null;
  try {
    savedSettings = JSON.parse(
      await fs.readFile(path.join(settingDir(config), 'config.json'), 'utf-8')
    ) as Record<string, unknown>;
  } catch {}

  console.log();
  console.log(C.bold('  Bailey Wiki Status'));
  console.log(C.dim('  ' + '─'.repeat(40)));
  console.log(`  Project:    ${C.dim(config.project)}`);
  console.log(`  Sources:    ${C.cyan(String(files.length))} files`);
  console.log(`  Wiki pages: ${C.cyan(String(wikiFiles.length))} files`);
  console.log(`  Setting:    ${C.dim(path.join(config.wiki.dir, '.setting/'))}`);
  const ss = savedSettings as Record<string, unknown> | null;
  const ssLlm = ss?.['llm'] as Record<string, unknown> | undefined;
  const ssBedrock = ssLlm?.['bedrock'] as Record<string, unknown> | undefined;
  const model = (ssLlm?.['model'] as string | undefined) ?? config.llm.model;
  const profile = (ssBedrock?.['profile'] as string | undefined) ?? config.llm.bedrock.profile;
  const region = (ssBedrock?.['region'] as string | undefined) ?? config.llm.bedrock.region;
  console.log(`  Provider:   ${C.green('bedrock')} (${profile} / ${region})`);
  console.log(`  Model:      ${C.dim(model as string)}`);
  console.log(`  Language:   ${C.dim(config.language)}`);
  console.log(
    `  Last run:   ${state.lastCommit ? C.dim(state.lastCommit.slice(0, 8)) : C.yellow('never')}`
  );
  console.log(
    `  HEAD:       ${headCommit ? C.dim(headCommit.slice(0, 8)) : C.dim('unknown')}`
  );
  if (state.lastCommit && headCommit && state.lastCommit !== headCommit) {
    const changed = getChangedFiles(config.project, state.lastCommit);
    console.log(`  Pending:    ${C.yellow(String(changed.length))} changed files since last run`);
  }
  console.log();
}
