export type SupportedLang = 'ko' | 'en' | 'ja' | 'zh' | 'es';

export interface LangPrompt {
  langRule: string[];
  titleHint: string;
  overviewHint: string;
  responsibilitiesHint: string;
  logicHint: string;
  openQuestionsHint: string;
  relatedNote: string;
  descRule: string;
  unimplemented: string;
}

export interface BedrockConfig {
  profile: string;
  region: string;
}

export interface LLMConfig {
  model: string;
  bedrock: BedrockConfig;
}

export interface SourcesConfig {
  include: string[];
  exclude: string[];
  extensions: string[];
}

export interface WikiConfig {
  dir: string;
  obsidian: boolean;
}

export interface BaileyWikiConfig {
  project: string;
  customPrompt: string;
  language: SupportedLang;
  llm: LLMConfig;
  sources: SourcesConfig;
  wiki: WikiConfig;
  concurrency: number;
}

export interface WikiState {
  lastCommit: string | null;
}

export interface ProcessResult {
  relPath: string;
  status: 'ok' | 'cached';
  wikiFile?: string;
  error?: string;
}

export interface FileSummary {
  name: string;
  summary: string;
  tags: string[];
  layer: string;
  dependencies: string[];
  contradictions: string | null;
}

export interface LintIssues {
  orphanWiki: string[];
  missingWiki: string[];
  deadLink: Array<{ wiki: string; ref: string }>;
  stalePath: Array<{ wiki: string; path: string }>;
}

export interface ListOutput {
  sourceFile: string;
  relPath: string;
  fileName: string;
  wikiFile: string;
  wikiExists: boolean;
  prompt: string;
}

export type BacklinkIndex = Record<string, string[]>;

export interface ConfigOverrides {
  project?: string;
  model?: string;
  concurrency?: number;
  profile?: string;
  region?: string;
  language?: string;
  wikiDir?: string;
}
