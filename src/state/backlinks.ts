import fs from 'node:fs/promises';
import path from 'node:path';
import { tryRead, ensureDir } from '../utils/fs.js';
import { settingDir } from './state.js';
import type { BaileyWikiConfig, BacklinkIndex } from '../types.js';

export async function buildBacklinkIndex(config: BaileyWikiConfig): Promise<BacklinkIndex> {
  const wikiDir = path.join(config.project, config.wiki.dir);
  const index: BacklinkIndex = {}; // key: linked name (no ext), value: [wikiFilePath]

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!e.name.endsWith('.md') || e.name.startsWith('_')) continue;
      const content = await tryRead(full);
      const refs = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
      for (const ref of refs) {
        if (!index[ref]) index[ref] = [];
        if (!index[ref].includes(full)) index[ref].push(full);
      }
    }
  }

  await walk(wikiDir);
  return index;
}

export async function saveBacklinkIndex(config: BaileyWikiConfig, index: BacklinkIndex): Promise<void> {
  await ensureDir(settingDir(config));
  await fs.writeFile(
    path.join(settingDir(config), 'backlinks.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );
}

export async function loadBacklinkIndex(config: BaileyWikiConfig): Promise<BacklinkIndex> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(settingDir(config), 'backlinks.json'), 'utf-8')
    ) as BacklinkIndex;
  } catch {
    return {};
  }
}
