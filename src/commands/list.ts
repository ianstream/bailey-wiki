import fs from 'node:fs/promises';
import path from 'node:path';
import { collectSourceFiles, sourceToWikiPath } from '../source/collector.js';
import { parseImports } from '../source/parser.js';
import { buildPrompt } from '../llm/prompt.js';
import type { BaileyWikiConfig, ListOutput } from '../types.js';

export async function cmdList(config: BaileyWikiConfig): Promise<void> {
  const files = await collectSourceFiles(config);
  const output: ListOutput[] = [];

  for (const sourceFile of files) {
    const relPath = path.relative(config.project, sourceFile);
    const fileName = path.basename(sourceFile);
    const ext = path.extname(fileName);
    const wikiFile = sourceToWikiPath(sourceFile, config.project, config.wiki.dir);

    let wikiExists = false;
    try {
      await fs.access(wikiFile);
      wikiExists = true;
    } catch {}

    const content = await fs.readFile(sourceFile, 'utf-8');
    const imports = parseImports(content, ext);
    const prompt = buildPrompt(fileName, relPath, content, imports, [], config);

    output.push({
      sourceFile,
      relPath,
      fileName,
      wikiFile,
      wikiExists,
      prompt,
    });
  }

  process.stdout.write(JSON.stringify(output));
}
