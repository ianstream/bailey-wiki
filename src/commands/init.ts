import path from 'node:path';
import { collectSourceFiles } from '../source/collector.js';
import { processFile } from '../wiki/processor.js';
import { loadState, saveState } from '../state/state.js';
import { saveSettings } from '../config/config.js';
import { buildBacklinkIndex, saveBacklinkIndex } from '../state/backlinks.js';
import { getHeadCommit } from '../state/git.js';
import { generateHotCache } from '../synthesize/generators.js';
import { log, warn, err, C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdInit(config: BaileyWikiConfig): Promise<void> {
  const files = await collectSourceFiles(config);
  if (files.length === 0) {
    warn('No source files found. Check your config sources.include paths.');
    return;
  }

  log(`Found ${files.length} source files`);
  log(
    `Model: ${config.llm.model} (bedrock: ${config.llm.bedrock.profile}) | Concurrency: ${config.concurrency}`
  );
  console.log();

  const state = await loadState(config);
  let done = 0, skipped = 0, failed = 0;

  for (let i = 0; i < files.length; i += config.concurrency) {
    const batch = files.slice(i, i + config.concurrency);

    process.stdout.write(
      `\r${C.cyan(`[${i + 1}-${Math.min(i + batch.length, files.length)}/${files.length}]`)} ${C.dim(path.relative(config.project, batch[0]).slice(0, 60))}${''.padEnd(20)}`
    );

    const results = await Promise.allSettled(batch.map((f) => processFile(f, config)));

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

  // Save head commit + settings
  const headCommit = getHeadCommit(config.project);
  if (headCommit) state.lastCommit = headCommit;
  await saveState(config, state);
  await saveSettings(config);

  // Build and save backlink index after init
  log('백링크 인덱스 생성 중...');
  const backlinkIndex = await buildBacklinkIndex(config);
  await saveBacklinkIndex(config, backlinkIndex);

  // Generate hot cache
  log('hot.md 생성 중...');
  const hotPath = await generateHotCache(config, files);
  log(`${C.green('✓')} ${path.relative(config.project, hotPath)}`);

  console.log();
  console.log(C.bold('  ── Init Complete ──'));
  console.log(`  Generated: ${C.green(String(done))}`);
  console.log(`  Skipped:   ${C.dim(String(skipped))} (unchanged)`);
  console.log(`  Failed:    ${failed > 0 ? C.red(String(failed)) : '0'}`);
  console.log(`  Wiki dir:  ${C.dim(path.join(config.project, config.wiki.dir))}`);
  console.log();
}
