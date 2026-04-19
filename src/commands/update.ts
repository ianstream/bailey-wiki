import fs from 'node:fs/promises';
import path from 'node:path';
import { collectSourceFiles, sourceToWikiPath } from '../source/collector.js';
import { processFile } from '../wiki/processor.js';
import { loadState, saveState } from '../state/state.js';
import { saveSettings } from '../config/config.js';
import { buildBacklinkIndex, saveBacklinkIndex, loadBacklinkIndex } from '../state/backlinks.js';
import { getHeadCommit, getChangedFiles } from '../state/git.js';
import { generateHotCache } from '../synthesize/generators.js';
import { matchesGlob } from '../utils/glob.js';
import { log, warn, err, C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdUpdate(
  config: BaileyWikiConfig,
  overrideFromCommit?: string
): Promise<void> {
  const state = await loadState(config);

  const fromCommit = overrideFromCommit ?? state.lastCommit;
  if (!fromCommit) {
    warn('No previous run found. Run `bailey-wiki init` first.');
    return;
  }

  const headCommit = getHeadCommit(config.project);
  if (headCommit === fromCommit) {
    log('No new commits since last run.');
    await saveSettings(config);
    return;
  }

  const changedFiles = getChangedFiles(config.project, fromCommit);
  const { extensions, exclude } = config.sources;
  const relevant = changedFiles.filter((f) => {
    const ext = path.extname(f);
    if (!extensions.includes(ext)) return false;
    const rel = path.relative(config.project, f);
    return !matchesGlob(rel, exclude);
  });

  if (relevant.length === 0) {
    log('No relevant source changes found.');
    state.lastCommit = headCommit;
    await saveState(config, state);
    return;
  }

  // Load backlink index to find referencing wikis
  const backlinkIndex = await loadBacklinkIndex(config);

  // Collect wiki files that reference any changed source file
  const referencingWikiFiles = new Set<string>();
  for (const sourceFile of relevant) {
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const refs = backlinkIndex[baseName] ?? [];
    for (const wikiFile of refs) {
      const correspondingSource = relevant.find(
        (f) => sourceToWikiPath(f, config.project, config.wiki.dir) === wikiFile
      );
      if (!correspondingSource) referencingWikiFiles.add(wikiFile);
    }
  }

  if (referencingWikiFiles.size > 0) {
    log(`연관 위키 ${referencingWikiFiles.size}개 추가 갱신 예정 (백링크)`);
  }

  log(`${relevant.length} changed files since ${fromCommit.slice(0, 8)}`);
  log(
    `Model: ${config.llm.model} (bedrock: ${config.llm.bedrock.profile}) | Concurrency: ${config.concurrency}`
  );
  console.log();

  let done = 0, skipped = 0, failed = 0;

  for (let i = 0; i < relevant.length; i += config.concurrency) {
    const batch = relevant.slice(i, i + config.concurrency);

    process.stdout.write(
      `\r${C.cyan(`[${i + 1}-${Math.min(i + batch.length, relevant.length)}/${relevant.length}]`)} ${C.dim(path.relative(config.project, batch[0]).slice(0, 60))}${''.padEnd(20)}`
    );

    const results = await Promise.allSettled(
      batch.map((f) => processFile(f, config, { forceRegenerate: true }))
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        if (r.value.status === 'cached') {
          skipped++;
        } else {
          done++;
          console.log();
          log(`${C.green('✓')} ${r.value.relPath}`);
        }
      } else {
        failed++;
        console.log();
        err(`${path.relative(config.project, batch[j])}: ${(r.reason as Error)?.message}`);
      }
    }
  }

  // Regenerate referencing wiki files (backlink-referenced)
  for (const wikiFile of referencingWikiFiles) {
    const relToWikiDir = path.relative(
      path.join(config.project, config.wiki.dir),
      wikiFile
    );
    const withoutMd = relToWikiDir.replace(/\.md$/, '');
    let found = false;
    for (const ext of config.sources.extensions) {
      const candidate = path.join(config.project, withoutMd + ext);
      try {
        await fs.access(candidate);
        log(`백링크 갱신: ${path.relative(config.project, candidate)}`);
        const result = await processFile(candidate, config, { forceRegenerate: true });
        if (result.status === 'ok') { done++; }
        found = true;
        break;
      } catch {}
    }
    if (!found) {
      warn(`백링크 소스 파일 없음: ${relToWikiDir}`);
    }
  }

  state.lastCommit = headCommit;
  await saveState(config, state);
  await saveSettings(config);

  // Rebuild and save backlink index after update
  const updatedBacklinks = await buildBacklinkIndex(config);
  await saveBacklinkIndex(config, updatedBacklinks);

  // Generate hot cache with recently changed files
  log('hot.md 갱신 중...');
  const hotPath = await generateHotCache(config, relevant);
  log(`${C.green('✓')} ${path.relative(config.project, hotPath)}`);

  console.log();
  console.log(C.bold('  ── Update Complete ──'));
  console.log(`  Updated:   ${C.green(String(done))}`);
  console.log(`  Skipped:   ${C.dim(String(skipped))} (unchanged)`);
  console.log(`  Failed:    ${failed > 0 ? C.red(String(failed)) : '0'}`);
  console.log(`  Last commit: ${C.dim(headCommit ? headCommit.slice(0, 8) : 'unknown')}`);
  console.log();
}
