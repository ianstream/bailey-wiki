import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../utils/fs.js';
import type { BaileyWikiConfig, WikiState } from '../types.js';
import { log } from '../utils/logger.js';

export function settingDir(config: BaileyWikiConfig): string {
  return path.join(config.project, config.wiki.dir, '.setting');
}

export async function migrateState(config: BaileyWikiConfig): Promise<void> {
  const oldPath = path.join(config.project, '.bailey-wiki', 'state.json');
  const newDir = settingDir(config);
  const newPath = path.join(newDir, 'state.json');
  try {
    await fs.access(oldPath);
    try {
      await fs.access(newPath);
      return; // already migrated
    } catch {}
    await ensureDir(newDir);
    await fs.copyFile(oldPath, newPath);
    await fs.rm(path.join(config.project, '.bailey-wiki'), { recursive: true, force: true });
    log(`Migrated state: .bailey-wiki/ → ${config.wiki.dir}/.setting/`);
  } catch {}
}

export async function loadState(config: BaileyWikiConfig): Promise<WikiState> {
  await migrateState(config);
  const p = path.join(settingDir(config), 'state.json');
  try {
    const state = JSON.parse(await fs.readFile(p, 'utf-8')) as Partial<WikiState>;
    return { lastCommit: state.lastCommit ?? null };
  } catch {
    return { lastCommit: null };
  }
}

export async function saveState(config: BaileyWikiConfig, state: WikiState): Promise<void> {
  await ensureDir(settingDir(config));
  await fs.writeFile(
    path.join(settingDir(config), 'state.json'),
    JSON.stringify({ lastCommit: state.lastCommit }, null, 2),
    'utf-8'
  );
}
