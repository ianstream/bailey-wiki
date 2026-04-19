import fs from 'node:fs/promises';
import path from 'node:path';
import { callLLM } from '../llm/client.js';
import { buildPrompt } from '../llm/prompt.js';
import { parseImports } from '../source/parser.js';
import { sourceToWikiPath } from '../source/collector.js';
import { tryRead, ensureDir } from '../utils/fs.js';
import type { BaileyWikiConfig, ProcessResult } from '../types.js';

// Pure function — testable
export function cleanLLMResponse(result: string): string {
  // Strip wrapping ```markdown ... ``` if LLM wrapped the output
  let cleaned = result
    .replace(/^```(?:markdown)?\n/, '')
    .replace(/\n```\s*$/, '');

  // Fix frontmatter: remove ```yaml fence wrapping the YAML frontmatter
  cleaned = cleaned
    .replace(/^```yaml\n(---\n[\s\S]*?\n---)\n```/m, '$1')
    .replace(/^```yaml\n(---\n[\s\S]*?\n---)/m, '$1');

  // Fix related field: remove wikilinks [[Name]] → Name, flatten nested arrays [["Foo"]] → [Foo]
  cleaned = cleaned.replace(/^(related:\s*)\[(.+)\]/m, (_match, prefix, items) => {
    // Remove complete [[Name]] wikilink syntax → plain name
    let flat = (items as string).replace(/\[\[([^\]]+)\]\]/g, '$1');
    // Remove incomplete/stray [[ or [ brackets (e.g. [[[db, [[types)
    flat = flat.replace(/\[+/g, '').replace(/\]+/g, '');
    // Remove quotes
    flat = flat.replace(/"/g, '');
    // Clean up extra commas and spaces
    flat = flat.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
    return `${prefix as string}[${flat}]`;
  });

  // Fix unclosed code fences
  const fenceCount = (cleaned.match(/^```/gm) ?? []).length;
  if (fenceCount % 2 !== 0) {
    cleaned += '\n```';
  }

  return cleaned;
}

export async function processFile(
  sourceFile: string,
  config: BaileyWikiConfig,
  options: { forceRegenerate?: boolean } = {}
): Promise<ProcessResult> {
  const { project, llm, wiki } = config;
  const relPath = path.relative(project, sourceFile);
  const fileName = path.basename(sourceFile);
  const ext = path.extname(fileName);
  const wikiFile = sourceToWikiPath(sourceFile, project, wiki.dir);

  // Skip if wiki file already exists (init mode only)
  if (!options.forceRegenerate) {
    try {
      await fs.access(wikiFile);
      return { relPath, status: 'cached' };
    } catch {
      // Wiki file missing — generate
    }
  }

  const content = await fs.readFile(sourceFile, 'utf-8');
  const imports = parseImports(content, ext);

  // Gather related file contents for context accuracy
  const relatedContents: Array<{ name: string; content: string }> = [];
  const sourceDir = path.dirname(sourceFile);
  for (const importName of imports.slice(0, 5)) {
    // Search for related source files in the same directory and parent
    for (const searchDir of [sourceDir, path.join(sourceDir, '..')]) {
      for (const searchExt of [ext, '.kt', '.java']) {
        const candidate = path.join(searchDir, importName + searchExt);
        try {
          const relatedContent = await fs.readFile(candidate, 'utf-8');
          relatedContents.push({ name: importName + searchExt, content: relatedContent.slice(0, 3000) });
          break;
        } catch {}
      }
    }
  }

  const prompt = buildPrompt(fileName, relPath, content, imports, relatedContents, config);

  const result = await callLLM([{ role: 'user', content: prompt }], llm);

  if (!result) throw new Error('Empty LLM response');

  const cleaned = cleanLLMResponse(result);

  // Write wiki file
  await ensureDir(path.dirname(wikiFile));
  await fs.writeFile(wikiFile, cleaned, 'utf-8');

  return { relPath, status: 'ok', wikiFile };
}
