import path from 'node:path';
import { processFile } from '../wiki/processor.js';
import { log, err, C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdRegen(
  config: BaileyWikiConfig,
  targetFile: string
): Promise<void> {
  log(`Regenerating: ${path.relative(config.project, targetFile)}`);
  const result = await processFile(targetFile, config, { forceRegenerate: true });
  if (result.status === 'ok') {
    log(`${C.green('✓')} ${path.relative(config.project, targetFile)}`);
  } else {
    err(`Failed: ${result.error ?? 'unknown error'}`);
  }
}
