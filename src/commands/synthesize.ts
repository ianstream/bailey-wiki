import path from 'node:path';
import { collectWikiFiles, chunkWikiFiles } from '../wiki/collector.js';
import { summarizeChunk } from '../synthesize/summarizer.js';
import {
  generateIndexDoc,
  generateArchitectureDoc,
  generateContradictionsDoc,
  generateHotCache,
} from '../synthesize/generators.js';
import { log, warn, C } from '../utils/logger.js';
import type { BaileyWikiConfig } from '../types.js';

export async function cmdSynthesize(config: BaileyWikiConfig): Promise<void> {
  const wikiFiles = await collectWikiFiles(config);
  if (wikiFiles.length === 0) {
    warn('위키 파일 없음. 먼저 `bailey-wiki init`을 실행하세요.');
    return;
  }

  log(`위키 파일 ${wikiFiles.length}개 발견`);
  log(`Model: ${config.llm.model} (bedrock: ${config.llm.bedrock.profile})`);
  console.log();

  const chunks = chunkWikiFiles(wikiFiles);
  log(`${chunks.length}개 청크로 분할하여 처리`);

  const allSummaries = [];

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r  청크 분석 중 [${i + 1}/${chunks.length}]...`);
    const summaries = await summarizeChunk(chunks[i], i, chunks.length, config.llm);
    allSummaries.push(...summaries);
  }
  console.log();

  log('_index.md 생성 중...');
  const indexPath = await generateIndexDoc(allSummaries, config);
  log(`${C.green('✓')} ${path.relative(config.project, indexPath)}`);

  log('_architecture.md 생성 중...');
  const archPath = await generateArchitectureDoc(allSummaries, config.llm, config);
  log(`${C.green('✓')} ${path.relative(config.project, archPath)}`);

  log('_contradictions.md 생성 중...');
  const contradictPath = await generateContradictionsDoc(allSummaries, config);
  log(`${C.green('✓')} ${path.relative(config.project, contradictPath)}`);

  log('hot.md 갱신 중...');
  const hotPath = await generateHotCache(config, [], allSummaries);
  log(`${C.green('✓')} ${path.relative(config.project, hotPath)}`);

  console.log();
  console.log(C.bold('  ── Synthesize Complete ──'));
  console.log(`  분석 파일:  ${C.cyan(String(wikiFiles.length))}`);
  console.log(`  청크 수:    ${C.dim(String(chunks.length))}`);
  console.log(`  생성 문서:`);
  console.log(`    ${C.green('wiki/_index.md')}          — 전체 인덱스 + 태그`);
  console.log(`    ${C.green('wiki/_architecture.md')}   — 아키텍처 + Mermaid`);
  console.log(`    ${C.green('wiki/_contradictions.md')} — 모순/불일치`);
  console.log(`    ${C.green('wiki/hot.md')}             — 핵심 컨텍스트 (세션 시작 시 읽기)`);
  console.log();
}
