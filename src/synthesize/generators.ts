import fs from 'node:fs/promises';
import path from 'node:path';
import { callLLM } from '../llm/client.js';
import { tryRead } from '../utils/fs.js';
import type { BaileyWikiConfig, FileSummary, LLMConfig } from '../types.js';

export async function generateIndexDoc(
  allSummaries: FileSummary[],
  config: BaileyWikiConfig
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `---`,
    `type: index`,
    `title: 코드베이스 인덱스`,
    `updated: ${today}`,
    `---`,
    ``,
    `# 코드베이스 인덱스`,
    ``,
    `> 자동 생성 — \`bailey-wiki synthesize\`로 갱신`,
    ``,
    `## 파일 목록`,
    ``,
    `| 파일 | 레이어 | 요약 | 태그 |`,
    `|------|--------|------|------|`,
  ];

  for (const s of allSummaries) {
    const tags = (s.tags ?? []).map((t) => `\`${t}\``).join(', ');
    lines.push(`| [[${s.name}]] | ${s.layer ?? '-'} | ${s.summary ?? '-'} | ${tags} |`);
  }

  const tagMap: Record<string, string[]> = {};
  for (const s of allSummaries) {
    for (const tag of (s.tags ?? [])) {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(s.name);
    }
  }

  lines.push(``, `## 태그 인덱스`, ``);
  for (const [tag, names] of Object.entries(tagMap).sort()) {
    lines.push(`- **${tag}**: ${names.map((n) => `[[${n}]]`).join(', ')}`);
  }

  const outPath = path.join(config.project, config.wiki.dir, '_index.md');
  await fs.writeFile(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}

export async function generateArchitectureDoc(
  allSummaries: FileSummary[],
  llm: LLMConfig,
  config: BaileyWikiConfig
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const compact = allSummaries
    .map(
      (s) =>
        `${s.name} [${s.layer}]: ${s.summary} → depends: ${(s.dependencies ?? []).join(', ')}`
    )
    .join('\n');

  const prompt = [
    `당신은 소프트웨어 아키텍처 분석가입니다.`,
    `아래는 코드베이스의 전체 파일 요약입니다.`,
    ``,
    `다음 내용을 포함하는 아키텍처 문서를 한글로 작성하세요:`,
    `1. 전체 아키텍처 개요 (2-3문장)`,
    `2. 레이어별 구성 (controller/service/repository 등)`,
    `3. 핵심 도메인/모듈 설명`,
    `4. Mermaid flowchart (주요 의존 흐름, 20개 이하 노드)`,
    `5. 주요 데이터 흐름 설명`,
    ``,
    `YAML frontmatter 포함:`,
    `---`,
    `type: architecture`,
    `title: 아키텍처 개요`,
    `updated: ${today}`,
    `---`,
    ``,
    `## 파일 요약`,
    compact.slice(0, 60000),
  ].join('\n');

  const result = await callLLM([{ role: 'user', content: prompt }], llm);
  const outPath = path.join(config.project, config.wiki.dir, '_architecture.md');
  await fs.writeFile(outPath, result, 'utf-8');
  return outPath;
}

export async function generateContradictionsDoc(
  allSummaries: FileSummary[],
  config: BaileyWikiConfig
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const contradictions = allSummaries.filter((s) => s.contradictions);

  const lines = [
    `---`,
    `type: contradictions`,
    `title: 모순/불일치 감지`,
    `updated: ${today}`,
    `---`,
    ``,
    `# 모순/불일치 감지`,
    ``,
    `> 자동 생성 — \`bailey-wiki synthesize\`로 갱신`,
    ``,
  ];

  if (contradictions.length === 0) {
    lines.push(`감지된 모순/불일치 없음.`);
  } else {
    lines.push(`## 감지 목록`, ``);
    for (const s of contradictions) {
      lines.push(`### [[${s.name}]]`, ``, `> [!contradiction]`, `> ${s.contradictions}`, ``);
    }
  }

  const outPath = path.join(config.project, config.wiki.dir, '_contradictions.md');
  await fs.writeFile(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}

export async function generateHotCache(
  config: BaileyWikiConfig,
  recentFiles: string[] = [],
  allSummaries: FileSummary[] = []
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const wikiDir = path.join(config.project, config.wiki.dir);

  // Recent changed files section
  const recentSection: string[] =
    recentFiles.length > 0
      ? [
          `## 최근 변경 파일`,
          ``,
          ...recentFiles.slice(0, 20).map((f) => {
            const name = path.basename(f, path.extname(f));
              return `- [[${name}]]`;
          }),
          ``,
        ]
      : [];

  // Architecture summary: prefer _architecture.md excerpt, else build from allSummaries
  let archSummary = '';
  const archPath = path.join(wikiDir, '_architecture.md');
  try {
    const archContent = await fs.readFile(archPath, 'utf-8');
    const bodyMatch = archContent.replace(/^---[\s\S]*?---\n/, '').trim();
    archSummary = bodyMatch.slice(0, 600);
  } catch {
    if (allSummaries.length > 0) {
      const layers: Record<string, string[]> = {};
      for (const s of allSummaries) {
        const l = s.layer ?? 'other';
        if (!layers[l]) layers[l] = [];
        layers[l].push(s.name);
      }
      archSummary = Object.entries(layers)
        .map(
          ([l, names]) =>
            `**${l}**: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` 외 ${names.length - 5}개` : ''}`
        )
        .join('\n');
    }
  }

  // Key dependencies from allSummaries (top 10 most referenced)
  const refCount: Record<string, number> = {};
  for (const s of allSummaries) {
    for (const dep of (s.dependencies ?? [])) {
      refCount[dep] = (refCount[dep] ?? 0) + 1;
    }
  }
  const topDeps = Object.entries(refCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => `- [[${name}]] — ${count}곳에서 참조`);

  const lines = [
    `---`,
    `type: hot-cache`,
    `title: Hot Cache`,
    `updated: ${today}`,
    `---`,
    ``,
    `# Hot Cache`,
    ``,
    `> 자동 생성 — \`bailey-wiki update\` 또는 \`bailey-wiki synthesize\` 실행 시 갱신`,
    `> 새 세션 시작 시 이 파일을 먼저 읽어 컨텍스트를 복원하세요.`,
    ``,
    ...recentSection,
    `## 아키텍처 요약`,
    ``,
    archSummary || 'synthesize를 실행하면 아키텍처 요약이 채워집니다.',
    ``,
    ...(topDeps.length > 0
      ? [`## 핵심 의존 관계 (참조 빈도순)`, ``, ...topDeps, ``]
      : []),
    `## 다음 액션`,
    ``,
    `\`\`\`bash`,
    `# 위키 최신화`,
    `bailey-wiki update --project ${config.project}`,
    ``,
    `# 전체 합성 (아키텍처/인덱스 갱신)`,
    `bailey-wiki synthesize --project ${config.project}`,
    `\`\`\``,
  ];

  const outPath = path.join(wikiDir, 'hot.md');
  await fs.writeFile(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}
