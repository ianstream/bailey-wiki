import path from 'node:path';
import { callLLM } from '../llm/client.js';
import { tryRead } from '../utils/fs.js';
import { warn } from '../utils/logger.js';
import type { LLMConfig, FileSummary } from '../types.js';

export async function summarizeChunk(
  wikiFilePaths: string[],
  chunkIdx: number,
  totalChunks: number,
  llm: LLMConfig
): Promise<FileSummary[]> {
  const contents = await Promise.all(
    wikiFilePaths.map(async (f) => {
      const content = await tryRead(f);
      const name = path.basename(f, '.md');
      return `### ${name}\n${content.slice(0, 3000)}`;
    })
  );

  const prompt = [
    `당신은 코드베이스 위키 분석가입니다. 아래는 코드 위키 파일 ${chunkIdx + 1}/${totalChunks} 청크입니다.`,
    ``,
    `각 파일에 대해 다음을 JSON 배열로 출력하세요:`,
    `[`,
    `  {`,
    `    "name": "파일명(확장자 제외)",`,
    `    "summary": "한 줄 요약 (한글, 50자 이내)",`,
    `    "tags": ["태그1", "태그2"],`,
    `    "layer": "controller|service|repository|entity|util|config|dto|component|other",`,
    `    "dependencies": ["연관파일명1", "연관파일명2"],`,
    `    "contradictions": "모순/불일치 사항 (없으면 null)"`,
    `  }`,
    `]`,
    ``,
    `JSON만 출력하세요. 다른 텍스트 없이.`,
    ``,
    `## 위키 파일들`,
    ...contents,
  ].join('\n');

  const result = await callLLM([{ role: 'user', content: prompt }], llm);
  try {
    const cleaned = result.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      warn(`청크 ${chunkIdx + 1} 응답이 배열이 아님 — 스킵`);
      return [];
    }
    return parsed.filter((item): item is FileSummary =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>)['name'] === 'string'
    );
  } catch {
    warn(`청크 ${chunkIdx + 1} JSON 파싱 실패 — 스킵`);
    return [];
  }
}
