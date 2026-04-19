import fs from 'node:fs/promises';
import path from 'node:path';
import { collectSourceFiles, sourceToWikiPath } from '../source/collector.js';
import { collectWikiFiles } from '../wiki/collector.js';
import { tryRead } from '../utils/fs.js';
import { C } from '../utils/logger.js';
import type { BaileyWikiConfig, LintIssues } from '../types.js';

export async function cmdLint(config: BaileyWikiConfig): Promise<void> {
  const sourceFiles = await collectSourceFiles(config);
  const sourceSet = new Set(sourceFiles.map((f) => path.relative(config.project, f)));

  const wikiFiles = await collectWikiFiles(config);

  const expectedWikiPaths = new Set(
    sourceFiles.map((f) => sourceToWikiPath(f, config.project, config.wiki.dir))
  );

  const allWikiNames = new Set(wikiFiles.map((f) => path.basename(f, '.md')));

  const issues: LintIssues = {
    orphanWiki: [],
    missingWiki: [],
    deadLink: [],
    stalePath: [],
  };

  // Check orphan wikis (wiki without source)
  for (const wikiFile of wikiFiles) {
    if (!expectedWikiPaths.has(wikiFile)) {
      issues.orphanWiki.push(path.relative(config.project, wikiFile));
    }
  }

  // Check missing wikis (source without wiki)
  for (const sourceFile of sourceFiles) {
    const wikiFile = sourceToWikiPath(sourceFile, config.project, config.wiki.dir);
    try {
      await fs.access(wikiFile);
    } catch {
      issues.missingWiki.push(path.relative(config.project, sourceFile));
    }
  }

  // Check dead links and stale paths
  for (const wikiFile of wikiFiles) {
    const content = await tryRead(wikiFile);
    const relWiki = path.relative(config.project, wikiFile);

    const refs = [...content.matchAll(/\[\[([^\]|]+)\]\]/g)].map((m) => m[1].trim());
    for (const ref of refs) {
      if (!allWikiNames.has(ref)) {
        issues.deadLink.push({ wiki: relWiki, ref });
      }
    }

    const pathMatch = content.match(/^path:\s*(.+)$/m);
    if (pathMatch) {
      const frontmatterPath = pathMatch[1].trim();
      if (!sourceSet.has(frontmatterPath)) {
        issues.stalePath.push({ wiki: relWiki, path: frontmatterPath });
      }
    }
  }

  const total =
    issues.orphanWiki.length +
    issues.missingWiki.length +
    issues.deadLink.length +
    issues.stalePath.length;

  console.log();
  console.log(C.bold('  ── Wiki Lint ──'));
  console.log(C.dim('  ' + '─'.repeat(40)));
  console.log(`  소스 파일:  ${C.cyan(String(sourceFiles.length))}`);
  console.log(`  위키 파일:  ${C.cyan(String(wikiFiles.length))}`);
  console.log(`  이슈 총계:  ${total > 0 ? C.red(String(total)) : C.green('0 (clean)')}`);
  console.log();

  if (issues.orphanWiki.length > 0) {
    console.log(C.yellow(`  ⚠ 고아 위키 (${issues.orphanWiki.length}) — 소스 파일이 삭제됨`));
    for (const f of issues.orphanWiki) console.log(`    ${C.dim(f)}`);
    console.log();
  }

  if (issues.missingWiki.length > 0) {
    console.log(
      C.yellow(`  ⚠ 위키 없는 소스 (${issues.missingWiki.length}) — init을 실행하세요`)
    );
    for (const f of issues.missingWiki.slice(0, 20)) console.log(`    ${C.dim(f)}`);
    if (issues.missingWiki.length > 20)
      console.log(`    ${C.dim(`... 외 ${issues.missingWiki.length - 20}개`)}`);
    console.log();
  }

  if (issues.deadLink.length > 0) {
    console.log(
      C.yellow(`  ⚠ 데드 링크 (${issues.deadLink.length}) — 존재하지 않는 [[wikilink]]`)
    );
    for (const { wiki, ref } of issues.deadLink.slice(0, 20))
      console.log(`    ${C.dim(wiki)} → [[${ref}]]`);
    if (issues.deadLink.length > 20)
      console.log(`    ${C.dim(`... 외 ${issues.deadLink.length - 20}개`)}`);
    console.log();
  }

  if (issues.stalePath.length > 0) {
    console.log(
      C.yellow(
        `  ⚠ 경로 불일치 (${issues.stalePath.length}) — frontmatter path가 소스와 다름`
      )
    );
    for (const { wiki, path: p } of issues.stalePath)
      console.log(`    ${C.dim(wiki)} → path: ${p}`);
    console.log();
  }

  if (total === 0) {
    console.log(`  ${C.green('✓')} 위키가 깨끗합니다.`);
    console.log();
  }
}
