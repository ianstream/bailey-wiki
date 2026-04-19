import path from 'node:path';
import { LANG_PROMPTS } from '../config/languages.js';
import type { BaileyWikiConfig } from '../types.js';

export function buildPrompt(
  fileName: string,
  relPath: string,
  content: string,
  imports: string[],
  relatedContents: Array<{ name: string; content: string }>,
  config: BaileyWikiConfig
): string {
  const ext = path.extname(fileName);
  const codeLang =
    ({ '.kt': 'Kotlin', '.java': 'Java', '.ts': 'TypeScript', '.tsx': 'TypeScript/React', '.js': 'JavaScript' } as Record<string, string>)[ext] || 'Code';
  const today = new Date().toISOString().slice(0, 10);
  const importLinks = imports.map((i) => `[[${i}]]`).join(', ') || '-';
  const lp = LANG_PROMPTS[config.language] ?? LANG_PROMPTS.ko;

  return [
    `You are an expert code analyst generating wiki documentation for Obsidian.`,
    ``,
    `## Language Rule (MANDATORY)`,
    ...lp.langRule,
    ``,
    `Analyze the following ${codeLang} source file and generate a comprehensive Obsidian-compatible markdown document.`,
    ``,
    `## File Info`,
    `- **File:** ${fileName}`,
    `- **Path:** ${relPath}`,
    `- **Language:** ${codeLang}`,
    `- **Date:** ${today}`,
    `- **Detected imports:** ${importLinks}`,
    ``,
    `## Output Requirements`,
    ``,
    `Generate a single markdown file with:`,
    ``,
    `1. **YAML frontmatter** (required, do NOT wrap in code fences):`,
    `---`,
    `type: source`,
    `title: <${lp.titleHint}>`,
    `path: ${relPath}`,
    `created: ${today}`,
    `updated: ${today}`,
    `tags: []`,
    `related: []`,
    `---`,
    ``,
    `2. **Overview** — ${lp.overviewHint}`,
    ``,
    `3. **Responsibilities** — ${lp.responsibilitiesHint}`,
    ``,
    `4. **Key Business Logic** — ${lp.logicHint}`,
    `   - Use tables, bullet lists, and code snippets as appropriate`,
    `   - **API Calls subsection**: ONLY add this if the file is a Controller, Router, Handler, or API definition file (contains @RestController, @Controller, @RequestMapping, router.get/post, app.get/post, express Route, etc.)`,
    `   - **NEVER add HTTP endpoints to Service, Repository, Util, or any non-controller file** — services do not expose HTTP endpoints directly`,
    `   - If the file IS a controller/router: document each endpoint with HTTP method + path + request param type (body vs query) + response type. Use actual values from source only.`,
    `   - For React event handlers, use exact prop names (onMouseDown, onBlur, onChange — no generalization)`,
    ``,
    `5. **State / Flow** (if applicable) — Mermaid diagrams:`,
    `   - State machine (stateDiagram-v2): only for components with explicit state (useState/useReducer)`,
    `   - Stateless components: use flowchart or sequenceDiagram instead`,
    `   - Sequence flow (sequenceDiagram)`,
    `   - Class relationships (classDiagram)`,
    `   - Only include when genuinely useful`,
    ``,
    `6. **Dependencies** — related file wikilinks:`,
    `   - \`[[FileName]]\` format — Obsidian builds graph automatically`,
    `   - Include ONLY classes/files that are ACTUALLY USED in the code (instantiated, called, referenced)`,
    `   - **Do NOT include unused imports** — if an import is declared but never referenced in the code body, exclude it`,
    `   - Exclude framework annotations (@Service, @Autowired, @Transactional etc.) and standard library types (List, Optional etc.) unless they are the primary subject`,
    ``,
    `7. **Open Questions** (optional) — ${lp.openQuestionsHint}`,
    ``,
    `## Important Rules`,
    `- YAML frontmatter MUST start and end with \`---\`. Never wrap in \`\`\`yaml code fences`,
    `- frontmatter \`related\` field: plain text array (e.g. \`related: [ClassName, AnotherClass]\`). No wikilinks in frontmatter`,
    `- Use \`[[ClassName]]\` wikilink format ONLY in the Dependencies section body`,
    `- ${lp.descRule}`,
    `- **Keep technical terms in English**: framework terms like Realm, Provider, Validator, Repository, Entity, Controller etc.`,
    `- Be specific and accurate — no generic descriptions`,
    `- **Section consistency**: Features described in Overview must match actual implementation. Mark unimplemented methods as "${lp.unimplemented}"`,
    `- **Logical consistency**: No self-contradictions in conditional descriptions`,
    `- **Class name accuracy**: Use exact class name of current file in log messages and descriptions`,
    `- **Type accuracy**: Interfaces, types, Props definitions must exactly reflect actual type definitions in source. Do not add or change fields by guessing`,
    `- **No unverifiable claims**: No assertions about security (XSS, GDPR etc.), performance, or accessibility that cannot be confirmed from code alone. Move uncertain claims to Open Questions`,
    `- **Open Questions must be genuinely uncertain**: Do NOT add Open Questions for things that are clearly readable from the source code. Only flag things that require external context (business rules, system behavior, data contracts) that cannot be determined from reading the code alone`,
    `- **Mermaid accuracy**: Only represent states/transitions that actually exist in code`,
    `- **Mermaid stateDiagram accuracy**: Each state must map 1:1 with actual state variable values. No conceptual intermediate states`,
    `- **Mermaid diagram type selection**: CSS class or boolean prop-controlled animation states are not React state — use notes instead of stateDiagram`,
    `- **Error handling completeness**: Document all branches in try-catch blocks. Include all switch cases and defaults`,
    `- Focus on business logic and policies, exclude boilerplate`,
    `- Sync frontmatter \`related\` field with body wikilinks`,
    `- **API completeness**: For Controller/Router files ONLY, document ALL HTTP endpoints. For Service/Repository files, document business methods without HTTP paths`,
    `- **API accuracy**: Verify paths/HTTP methods/param types from the actual source annotations or route definitions. Use "needs verification" for uncertain cells, never "(estimated)"`,
    `- **Event handler precision**: Record exact JSX event prop names (onMouseDown ≠ onClick)`,
    `- **No fabricated example code**: Only document methods and fields that actually exist in source. No "// example" code blocks`,
    `- **Flag potential issues**: Use warning text instead of code blocks for problems. E.g.: "⚠️ Warning: \`@PersistenceContext\` + \`final\` field — possible runtime injection failure"`,
    `- **Related file consistency**: Compare with related file contents provided below. Flag boundary condition mismatches with ⚠️`,
    ``,
    `## Source Code`,
    `\`\`\`${ext.replace('.', '')}`,
    content.length > 50000 ? content.slice(0, 50000) + '\n// [truncated...]' : content,
    `\`\`\``,
    ...(relatedContents.length > 0
      ? [
          ``,
          `## Related File Contents (${lp.relatedNote})`,
          ...relatedContents.map((r) =>
            [`### ${r.name}`, '```', r.content, '```'].join('\n')
          ),
        ]
      : []),
    ...(config.customPrompt
      ? [``, `## Custom Project Guidelines`, config.customPrompt]
      : []),
  ].join('\n');
}
