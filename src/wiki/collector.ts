import fs from 'node:fs/promises';
import path from 'node:path';
import type { BaileyWikiConfig } from '../types.js';

export async function collectWikiFiles(config: BaileyWikiConfig): Promise<string[]> {
  const wikiDir = path.join(config.project, config.wiki.dir);
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '.setting') continue; // skip wiki/.setting/ directory
        await walk(full);
        continue;
      }
      // Skip meta files (_index.md, _architecture.md, _contradictions.md)
      if (e.name.endsWith('.md') && !e.name.startsWith('_')) results.push(full);
    }
  }

  await walk(wikiDir);
  return results;
}

export function chunkWikiFiles(wikiFiles: string[], maxTokensPerChunk = 70000): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const f of wikiFiles) {
    current.push(f);
    currentTokens += 1000; // rough avg tokens per wiki file (korean content ~1000 tokens)
    if (currentTokens >= maxTokensPerChunk) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
