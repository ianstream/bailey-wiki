import fs from 'node:fs/promises';
import path from 'node:path';
import { matchesGlob } from '../utils/glob.js';
import type { BaileyWikiConfig } from '../types.js';

export function sourceToWikiPath(sourceFile: string, projectPath: string, wikiDir: string): string {
  const rel = path.relative(projectPath, sourceFile);
  const withoutExt = rel.replace(/\.[^.]+$/, '');
  return path.join(projectPath, wikiDir, `${withoutExt}.md`);
}

async function walkFiles(
  dir: string,
  extensions: string[],
  exclude: string[],
  projectPath: string
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try { entries = await fs.readdir(current, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(projectPath, full);
      if (matchesGlob(rel, exclude)) continue;
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

export async function collectSourceFiles(config: BaileyWikiConfig): Promise<string[]> {
  const { include, exclude, extensions } = config.sources;
  const allFiles: string[] = [];

  for (const includePath of include) {
    const absPath = path.join(config.project, includePath);
    try {
      await fs.access(absPath);
      const files = await walkFiles(absPath, extensions, exclude, config.project);
      allFiles.push(...files);
    } catch {}
  }

  return [...new Set(allFiles)].sort();
}
