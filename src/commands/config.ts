import { C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdConfig(config: BaileyWikiConfig): Promise<void> {
  console.log();
  console.log(C.bold('  Bailey Wiki Configuration'));
  console.log(C.dim('  ' + '─'.repeat(40)));
  console.log(JSON.stringify(config, null, 2));
  console.log();
}
