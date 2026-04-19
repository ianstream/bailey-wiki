import type { SupportedLang, LangPrompt } from '../types.js';

export const SUPPORTED_LANGS: SupportedLang[] = ['ko', 'en', 'ja', 'zh', 'es'];

export const LANG_PROMPTS: Record<SupportedLang, LangPrompt> = {
  ko: {
    langRule: [
      `Write ALL descriptive text in **Korean**: summaries, explanations, bullet point bodies, section prose, table cell descriptions, Mermaid node labels, and open questions.`,
      `Keep in English: code identifiers, class names, function names, variable names, file names, HTTP methods/paths, type names, and code inside fenced blocks.`,
      `**Section headings MUST be in Korean.** Use Korean equivalents: "개요", "주요 책임", "핵심 비즈니스 로직", "의존성", "주의사항", "열린 질문" etc.`,
    ],
    titleHint: '한글 제목',
    overviewHint: '이 파일이 하는 일을 2-3문장으로 한글로 요약',
    responsibilitiesHint: '주요 책임을 한글 bullet list로',
    logicHint: '이 파일의 핵심 로직/규칙/정책 (한글 설명, 코드명은 영어 유지)',
    openQuestionsHint: '불명확한 사항, 사람이 검토해야 할 내용 (한글)',
    relatedNote: '일관성 검증용 — 문서화 대상 아님',
    descRule: '설명은 반드시 한글, 코드 식별자는 영어 원문 유지',
    unimplemented: '미구현',
  },
  en: {
    langRule: [
      `Write ALL descriptive text in **English**: summaries, explanations, bullet point bodies, section prose, table cell descriptions, Mermaid node labels, and open questions.`,
      `Keep code identifiers, class names, function names, variable names, file names, HTTP methods/paths, type names, and code inside fenced blocks as-is.`,
      `**Section headings MUST be in English.** Use: "Overview", "Responsibilities", "Key Business Logic", "Dependencies", "Open Questions" etc.`,
    ],
    titleHint: 'descriptive English title',
    overviewHint: '2-3 sentence summary of what this file does',
    responsibilitiesHint: 'key responsibilities as a bullet list',
    logicHint: 'core logic, rules, and policies of this file',
    openQuestionsHint: 'ambiguities or items needing human review',
    relatedNote: 'for consistency validation — not documentation targets',
    descRule: 'All descriptions in English. Keep code identifiers in their original form.',
    unimplemented: 'not implemented',
  },
  ja: {
    langRule: [
      `Write ALL descriptive text in **Japanese**: summaries, explanations, bullet point bodies, section prose, table cell descriptions, Mermaid node labels, and open questions.`,
      `Keep in English: code identifiers, class names, function names, variable names, file names, HTTP methods/paths, type names, and code inside fenced blocks.`,
      `**Section headings MUST be in Japanese.** Use: "概要", "主な責務", "主要ビジネスロジック", "依存関係", "未解決の質問" etc.`,
    ],
    titleHint: '日本語のタイトル',
    overviewHint: 'このファイルが何をするかを2〜3文で日本語で要約',
    responsibilitiesHint: '主な責務を日本語の箇条書きで',
    logicHint: 'このファイルの主要なロジック・ルール・ポリシー（説明は日本語、コード識別子は英語）',
    openQuestionsHint: '不明な点、人間がレビューすべき事項（日本語）',
    relatedNote: '整合性検証用 — 文書化対象ではない',
    descRule: '説明はすべて日本語、コード識別子は英語のまま維持',
    unimplemented: '未実装',
  },
  zh: {
    langRule: [
      `Write ALL descriptive text in **Chinese (Simplified)**: summaries, explanations, bullet point bodies, section prose, table cell descriptions, Mermaid node labels, and open questions.`,
      `Keep in English: code identifiers, class names, function names, variable names, file names, HTTP methods/paths, type names, and code inside fenced blocks.`,
      `**Section headings MUST be in Chinese.** Use: "概述", "主要职责", "核心业务逻辑", "依赖关系", "待解决问题" etc.`,
    ],
    titleHint: '中文标题',
    overviewHint: '用2-3句中文概括此文件的功能',
    responsibilitiesHint: '用中文列出主要职责',
    logicHint: '此文件的核心逻辑/规则/策略（中文说明，代码标识符保留英文）',
    openQuestionsHint: '不明确的事项，需要人工审查的内容（中文）',
    relatedNote: '用于一致性验证 — 非文档化目标',
    descRule: '说明必须用中文，代码标识符保留英文原文',
    unimplemented: '未实现',
  },
  es: {
    langRule: [
      `Write ALL descriptive text in **Spanish**: summaries, explanations, bullet point bodies, section prose, table cell descriptions, Mermaid node labels, and open questions.`,
      `Keep in English: code identifiers, class names, function names, variable names, file names, HTTP methods/paths, type names, and code inside fenced blocks.`,
      `**Section headings MUST be in Spanish.** Use: "Descripción general", "Responsabilidades", "Lógica de negocio clave", "Dependencias", "Preguntas abiertas" etc.`,
    ],
    titleHint: 'título descriptivo en español',
    overviewHint: 'resumen de 2-3 oraciones de lo que hace este archivo',
    responsibilitiesHint: 'responsabilidades principales en lista con viñetas en español',
    logicHint: 'lógica, reglas y políticas principales de este archivo (descripción en español, identificadores de código en inglés)',
    openQuestionsHint: 'ambigüedades o elementos que requieren revisión humana (en español)',
    relatedNote: 'para validación de consistencia — no son objetivos de documentación',
    descRule: 'Las descripciones deben estar en español. Mantener los identificadores de código en inglés.',
    unimplemented: 'no implementado',
  },
};
