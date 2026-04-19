# bailey-wiki

**LLM-powered code wiki generator with Obsidian graph support.**

Automatically analyzes source code and generates Markdown wiki files with Obsidian-compatible `[[wikilink]]` graph navigation.

**[한국어](README.ko.md)** | **[日本語](README.ja.md)** | **[中文](README.zh.md)** | **[Español](README.es.md)**

> Inspired by [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — adapted for codebases: instead of personal knowledge bases, bailey-wiki builds and maintains a persistent, compounding wiki from your source code. Knowledge compounds with every commit.

---

## Features

- **1:1 source mirroring** — wiki files follow the exact same directory structure as source
- **Obsidian graph** — `[[wikilink]]` cross-references auto-build dependency graphs
- **Real dependency parsing** — detects actual imports, not just file names
- **Mermaid diagrams** — state machines, sequence flows, class relationships (auto-generated)
- **Incremental updates** — `update` command uses `git diff` to process only changed files
- **Backlink index** — `update` auto-regenerates wikis that reference changed files via `[[wikilink]]`
- **Wiki synthesis** — `synthesize` compiles entire wiki into `_index.md`, `_architecture.md`, `_contradictions.md`
- **Wiki file cache** — unchanged files are skipped automatically (skips if wiki file already exists)
- **AWS Bedrock backend** — Nova Micro/Lite/Pro, Claude Haiku/Sonnet via Bedrock inference profiles
- **Multi-language output** — wiki content in Korean, English, Japanese, Chinese, or Spanish (`--lang`)
- **Wiki lint** — `lint` command detects orphan wikis, missing wikis, dead links, and stale paths
- **Claude Code skill** — use `generate-wiki` skill to generate wikis via Claude Code subagents (no external LLM needed)
- **TypeScript** — strict-mode TypeScript source, modular architecture, 43 unit tests

---

## Install

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install
npm run build   # compile TypeScript → dist/

# Optional: install globally
npm link
```

**Requirements:** Node.js 18+, TypeScript (installed as devDependency via `npm install`)

### Development

```bash
npm run dev     # run directly with tsx (no build needed)
npm test        # run 43 unit tests
npm run build   # compile to dist/
```

---

## How to Use

### Getting Started (First Time)

**Step 1: Install bailey-wiki**

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install && npm run build
npm link   # makes `bailey-wiki` available globally
```

**Step 2: Configure AWS Bedrock**

```bash
aws configure --profile my-profile
# enter your AWS credentials
```

**Step 3: Initialize your first repo**

```bash
# Go to the repo you want to document
cd ~/git/my-project

# Generate wiki for all source files (first run)
bailey-wiki init --project . --profile my-profile

# Check what was generated
bailey-wiki status --project .
```

This creates a `wiki/` directory mirroring your source structure:
```
src/main/kotlin/com/example/OrderService.kt
→ wiki/src/main/kotlin/com/example/OrderService.md
```

**Step 4: Install the git hook (auto-update on commit)**

```bash
bash /path/to/bailey-wiki/install-hook.sh ~/git/my-project
```

From now on, every commit that changes source files automatically runs `bailey-wiki update`.

---

### Daily Workflow

After the initial `init`, your typical workflow is:

```bash
# 1. Make code changes and commit as usual
git commit -m "feat: add payment retry logic"
# → post-commit hook auto-runs bailey-wiki update

# 2. Periodically check wiki health (every 10–15 commits)
bailey-wiki lint --project ~/git/my-project

# 3. Synthesize integration docs when you need a big-picture view
bailey-wiki synthesize --project ~/git/my-project
```

The three commands serve different purposes:

| Command | When to run | What it does |
|---------|------------|--------------|
| `update` | After every commit (auto via hook) | Regenerates wikis for changed files + referencing wikis |
| `lint` | Every 10–15 commits | Finds orphan wikis, dead links, missing wikis |
| `synthesize` | Weekly or after major changes | Builds `_index.md`, `_architecture.md`, `_contradictions.md`, `hot.md` |

---

### Managing Multiple Repos

bailey-wiki is designed around **per-repo wikis**. Each repo has its own independent `wiki/` directory.

```
~/git/
├── my-server/
│   └── wiki/              ← server wiki
│       ├── hot.md
│       ├── _index.md
│       ├── _architecture.md
│       └── src/...
├── my-frontend/
│   └── wiki/              ← frontend wiki (independent)
│       ├── hot.md
│       └── src/...
└── ...
```

**Initialize multiple repos at once:**

```bash
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --profile my-profile \
  --concurrency 8
```

**Install hooks in each repo:**

```bash
for repo in ~/git/my-server ~/git/my-frontend ~/git/my-api; do
  bash /path/to/bailey-wiki/install-hook.sh $repo
done
```

---

### Claude Code Integration

Connect your wiki to Claude Code so it can answer questions about your codebase without reading source files directly.

**Step 1: Add to your project's `CLAUDE.md`**

```markdown
## Wiki Knowledge Base

When starting work on this codebase:
1. Read `wiki/hot.md` first — recent changes + architecture summary (~30 seconds)
2. If more context needed, read `wiki/_index.md` — full file list with summaries
3. For architecture overview, read `wiki/_architecture.md`
4. Only then read individual wiki pages or source files

Do NOT read source files for context you can get from the wiki.
```

**Step 2: Keep wiki fresh**

```bash
# After pulling latest changes
git pull
bailey-wiki update --project .
```

**Step 3: Ask Claude Code questions**

```
"Which files handle payment processing?"
"What does OrderService depend on?"
"Show me the checkout flow"
"What changed recently?" (hot.md)
"Are there any contradictions in the wiki?" (_contradictions.md)
```

Claude reads `hot.md` first (recent context), then navigates to relevant wiki pages — no need to paste code manually.

**Step 4: Run synthesize for deeper context**

```bash
# After significant changes (weekly or after major features)
bailey-wiki synthesize --project ~/git/my-project
```

This updates `hot.md`, `_index.md`, `_architecture.md`, and `_contradictions.md` — giving Claude a comprehensive, always-current picture of your codebase.

---

## Quick Start

```bash
# Analyze entire project (Nova Lite by default)
bailey-wiki init --project ~/git/my-project --profile my-aws-profile

# Higher quality
bailey-wiki init --project ~/git/my-project \
  --profile my-aws-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0

# Update only files changed since last run
bailey-wiki update --project ~/git/my-project

# Show status
bailey-wiki status --project ~/git/my-project
```

---

## Configuration

Configuration is stored in `wiki/.setting/config.json`. On first run, settings are saved automatically. You can also create the file manually:

```json
{
  "language": "ko",
  "llm": {
    "model": "apac.amazon.nova-lite-v1:0",
    "bedrock": {
      "profile": "my-aws-profile",
      "region": "ap-northeast-2"
    }
  },
  "sources": {
    "include": ["src/main"],
    "exclude": ["**/test/**", "**/build/**"],
    "extensions": [".kt", ".java", ".ts", ".tsx"]
  },
  "wiki": {
    "dir": "wiki",
    "obsidian": true
  },
  "concurrency": 5
}
```

### Environment variables

```env
BAILEY_WIKI_LANG=ko          # ko | en | ja | zh | es (default: ko)
BAILEY_WIKI_MODEL=apac.amazon.nova-lite-v1:0
BAILEY_WIKI_AWS_PROFILE=my-profile
BAILEY_WIKI_AWS_REGION=ap-northeast-2
BAILEY_WIKI_PROJECT=/path/to/project
BAILEY_WIKI_CONCURRENCY=3
```

### Supported languages

| Code | Language |
|------|----------|
| `ko` | Korean (한국어) — default |
| `en` | English |
| `ja` | Japanese (日本語) |
| `zh` | Chinese Simplified (简体中文) |
| `es` | Spanish (Español) |

---

## CLI Reference

```
bailey-wiki <command> [options]

Commands:
  init     Generate wiki for all source files (skips if wiki file already exists)
  update   Update wiki for files changed since last git commit
  regen    Regenerate wiki for a specific file (always overwrites)
  status   Show project status (sources, wiki pages, LLM info)
  config   Print resolved configuration
  synthesize  Synthesize entire wiki into _index.md, _architecture.md, _contradictions.md
  lint        Check wiki health: orphans, missing wikis, dead links, stale paths

Options:
  --project <path>     Target project directory (repeatable for multiple projects)
  --model <id>         Bedrock inference profile ID (default: apac.amazon.nova-lite-v1:0)
  --concurrency <n>    Total parallel LLM slots (default: CPU core count)
  --profile <name>     AWS profile name (default: default)
  --region <name>      AWS region (default: ap-northeast-2)
  --lang <code>        Wiki language: ko | en | ja | zh | es (default: ko)
  --from <commit>      (update only) Override baseline commit instead of last run
  --file <path>        (regen only) Source file to regenerate
```

### Examples

```bash
# Single project, local proxy
bailey-wiki init --project ~/git/my-project

# Multiple projects in parallel, local proxy
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --concurrency 6

# Bedrock, single project
bailey-wiki init \
  --project ~/git/my-project \

  --profile prod \
  --model apac.amazon.nova-lite-v1:0

# Bedrock, multiple projects
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \

  --profile prod \
  --model apac.amazon.nova-lite-v1:0 \
  --concurrency 10

# Check status before running
bailey-wiki status --project ~/git/my-project

# Incremental update after commits
bailey-wiki update --project ~/git/my-project

# Regenerate a single file
bailey-wiki regen --project ~/git/my-project --file ~/git/my-project/src/Service.kt

# Synthesize entire wiki into integration docs
bailey-wiki synthesize --project ~/git/my-project

# Generate wiki in English
bailey-wiki init --project ~/git/my-project --profile my-profile --lang en

# Generate wiki in Japanese
bailey-wiki init --project ~/git/my-project --profile my-profile --lang ja

# Lint wiki health
bailey-wiki lint --project ~/git/my-project

# Recommended workflow
bailey-wiki update --project ~/git/my-project    # update wikis + hot.md
bailey-wiki lint --project ~/git/my-project      # check health
bailey-wiki synthesize --project ~/git/my-project # synthesize (when needed)
```

---

## Wiki Lint

`bailey-wiki lint` checks wiki health without calling any LLM — pure file system analysis.

### What it detects

| Category | Description |
|----------|-------------|
| **Orphan wiki** | Wiki file exists but source file was deleted |
| **Missing wiki** | Source file exists but no wiki file yet |
| **Dead link** | `[[wikilink]]` references a wiki that doesn't exist |
| **Stale path** | Frontmatter `path:` field doesn't match actual source location |

### Example output

```
  ── Wiki Lint ──
  ────────────────────────────────────────
  소스 파일:  234
  위키 파일:  198
  이슈 총계:  5

  ⚠ 고아 위키 (2) — 소스 파일이 삭제됨
    wiki/src/legacy/OldService.md
    wiki/src/deprecated/V1Controller.md

  ⚠ 위키 없는 소스 (2) — init을 실행하세요
    src/main/new/PaymentV2Service.kt
    src/main/new/RefundProcessor.kt

  ⚠ 데드 링크 (1) — 존재하지 않는 [[wikilink]]
    wiki/src/OrderService.md → [[DeletedHelper]]
```

### Recommended cadence

Run lint after every 10–15 `update` cycles, or whenever the codebase has had significant deletions or renames.

---

## AWS Bedrock Setup

### 1. Supported inference profiles

bailey-wiki requires **inference profile IDs** (not raw model IDs):

| Profile ID | Model | Cost (per 1M tokens in/out) |
|---|---|---|
| `apac.amazon.nova-micro-v1:0` | Nova Micro | $0.035 / $0.14 |
| `apac.amazon.nova-lite-v1:0` | Nova Lite | $0.06 / $0.24 |
| `apac.amazon.nova-pro-v1:0` | Nova Pro | $0.80 / $3.20 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | $0.08 / $0.40 |
| `global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 / $15.00 |

> Run `aws bedrock list-inference-profiles --type-equals SYSTEM_DEFINED` to see all available profiles in your account.

### 2. AWS credentials

Configure via `~/.aws/credentials` or AWS CLI:

```bash
aws configure --profile my-profile
```

Or use IAM role / environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

### 3. Required IAM permissions

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## Wiki Output

### Directory structure

Source files are mirrored 1:1 into `wiki/`:

```
src/main/kotlin/com/example/PurchaseService.kt
→ wiki/src/main/kotlin/com/example/PurchaseService.md
```

### Synthesis documents (generated by `synthesize`)

| File | Contents |
|------|----------|
| `wiki/hot.md` | Hot cache — recent changes + architecture summary (read first in new sessions) |
| `wiki/_index.md` | Full file list with one-line summaries and tag index |
| `wiki/_architecture.md` | Layer/domain breakdown, dependency flow, Mermaid graph |
| `wiki/_contradictions.md` | Detected contradictions across wiki pages |

### Generated document structure

Each wiki file contains:

```markdown
---
type: source
title: <descriptive title>
path: <source file path>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [domain, layer, ...]
related: [ClassName, AnotherClass]
---

## Overview
2-3 sentence summary of what the file does.

## Responsibilities
- Key responsibility 1
- Key responsibility 2

## Key Business Logic
Tables, decision trees, code snippets for important rules.
Includes API method tables (HTTP method, path, request/response types).

## State / Flow
Mermaid diagrams for state machines and sequence flows (when applicable).

## Dependencies
- [[RelatedClass]] — wikilink for Obsidian graph
- [[AnotherClass]]

## Open Questions
Ambiguities or things needing human review.
```

---

## Obsidian Integration

### 1. Open as Vault

Open the generated `wiki/` folder as an **Obsidian Vault**:

1. Obsidian → **Open folder as vault** → select `wiki/`
2. Enable **Graph View** → visualize file dependencies
3. `[[wikilinks]]` auto-connect related files

### 2. Claude Desktop MCP Integration (Recommended)

Connect Claude Desktop to your Obsidian vault so Claude can **search and answer questions** about your codebase using the generated wiki.

**Install the Local REST API plugin in Obsidian:**

1. Obsidian → Settings → Community plugins → Browse → search `Local REST API`
2. Install and enable it
3. Go to plugin settings → copy the **API Key**

**Configure Claude Desktop MCP** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uvx",
      "args": ["mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **Requirements:** `uvx` — install with `pip install uv` or `brew install uv`

**Restart Claude Desktop.** Claude now has direct access to your wiki vault.

### 3. Interactive Workflow

```
Generate wiki once:
  bailey-wiki init --project ~/git/my-project

Then ask Claude Desktop:
  "Which files handle payment processing?"
  "What does CartService depend on?"
  "Show me the state flow for checkout"
  "Which files were recently changed?" (use update to keep fresh)
```

Claude searches the wiki pages, reads the Mermaid diagrams and dependency links, and answers based on the generated documentation — no need to paste code manually.

**Keep wiki fresh after commits:**

```bash
# After git pull or new commits
bailey-wiki update --project ~/git/my-project

# Update from a specific commit
bailey-wiki update --project ~/git/my-project --from abc1234
```

---

## Multi-Project Workflow

```bash
# Process server + frontend in parallel
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --concurrency 8

# Concurrency is split evenly: 8 / 2 projects = 4 slots each
```

---

## Git Hook (Auto-update on commit)

Auto-run `bailey-wiki update` after every commit using the included install script.

### Install

```bash
# Install hook into a project
bash install-hook.sh ~/git/my-project

# Or from inside the project
cd ~/git/my-project
bash /path/to/bailey-wiki/install-hook.sh
```

### How it works

The hook only runs when:
1. `wiki/.setting/config.json` exists (bailey-wiki initialized)
2. The commit contains `.kt`, `.java`, `.ts`, `.tsx`, or `.js` file changes

```
git commit → post-commit hook → bailey-wiki update → wiki/*.md + hot.md updated
```

### Uninstall

```bash
rm ~/git/my-project/.git/hooks/post-commit
```

---

## CI/CD Integration

Auto-update wiki on every merge to main:

```yaml
# .github/workflows/wiki-update.yml
on:
  push:
    branches: [main]

jobs:
  wiki:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Update wiki
        run: bailey-wiki update --project .
        env:
          BAILEY_WIKI_PROVIDER: bedrock
          BAILEY_WIKI_AWS_PROFILE: ci
          BAILEY_WIKI_MODEL: apac.amazon.nova-lite-v1:0

      - name: Push wiki
        run: |
          cd wiki-repo
          git add .
          git commit -m "wiki: auto-update" && git push || true
```

---

## Claude Code Skill (generate-wiki)

Use the `generate-wiki` Claude Code skill to generate wikis **without an external LLM** — it uses Claude Code subagents directly.

### How it works

```
User → /generate-wiki → Orchestrator
                            ├── bailey-wiki list → file list JSON (with pre-built prompts)
                            ├── Filter: wikiExists: false only (or all)
                            └── N subagents in parallel → each writes one wiki .md file
```

### vs. CLI mode

| | CLI (`init`/`update`) | Claude Code skill (`generate-wiki`) |
|---|---|---|
| LLM | Local proxy or Bedrock | Claude Code session (current model) |
| Cost | API cost separate | Included in Claude Code usage |
| Best for | Automation / CI | Interactive development |
| Setup | Proxy or AWS credentials | None |

### Usage

Install the skill to your Claude Code skills directory, then invoke:

```
/generate-wiki
```

The skill will ask for:
- **Project path** (default: current directory)
- **Concurrency** (default: 5, max 10 recommended)
- **Scope**: `missing-only` (skip existing) or `all` (regenerate everything)

### How prompts are shared

`bailey-wiki list` outputs each source file's pre-built analysis prompt (the same prompt the CLI would send to the LLM). The skill passes these directly to Claude Code subagents — no duplication, no re-implementation.

```bash
# What the skill runs internally:
node /path/to/bailey-wiki/cli.mjs list --project ~/git/my-project > /tmp/wiki-list.json
# → JSON: [{ sourceFile, wikiFile, prompt, wikiExists }, ...]
```

---

## Hot Cache (wiki/hot.md)

`hot.md` is auto-generated after every `init`, `update`, and `synthesize`. It gives Claude instant context about the codebase at the start of a new session — no recap needed.

### What it contains

- **Recent changed files** — `[[wikilinks]]` to files modified in the last run
- **Architecture summary** — excerpt from `_architecture.md` (or layer breakdown if not yet synthesized)
- **Key dependencies** — most-referenced files ranked by backlink count

### How to use

Add this to your project's `CLAUDE.md`:

```markdown
## Wiki Knowledge Base

When starting work on this codebase:
1. Read `wiki/hot.md` first — recent changes + architecture summary
2. If more context needed, read `wiki/_index.md`
3. For specific domains, read `wiki/_architecture.md`
4. Only then read individual wiki pages
```

### When it updates

| Command | hot.md update |
|---------|--------------|
| `init` | ✅ recent files from full init |
| `update` | ✅ recent changed files |
| `synthesize` | ✅ enriched with allSummaries (most complete) |

---

## Architecture

```
bailey-wiki/
├── src/                     — TypeScript source
│   ├── cli.ts               — CLI entry point (arg parsing, dispatch)
│   ├── types.ts             — shared interfaces and types
│   ├── utils/               — pure utilities (logger, glob, fs, deep-merge, env-loader)
│   ├── config/              — language prompts and configuration loading
│   ├── source/              — source file collection and import parsing
│   ├── llm/                 — Bedrock client and prompt builder
│   ├── state/               — git state, backlink index, settings persistence
│   ├── wiki/                — wiki file processing and collection
│   ├── synthesize/          — chunk summarization and document generation
│   └── commands/            — individual command implementations
├── dist/                    — compiled JavaScript (generated by npm run build)
├── test/                    — TypeScript tests (node:test)
└── wiki/.setting/           — per-project state (inside target project)
    ├── config.json          — LLM/sources/concurrency settings (auto-saved)
    ├── state.json           — last processed git commit
    ├── backlinks.json       — reverse wikilink index (auto-built by init/update)
    └── prompt.md            — optional custom prompt suffix
```

### Data flow

```
Source files
    │
    ▼
parseImports()          — detect actual import dependencies
    │
    ▼
buildPrompt()           — construct LLM analysis prompt
    │
    ├──▶ callLLM()      — AWS Bedrock (CLI mode)
    │        │
    │        ▼
    │    wiki/*.md      — 1:1 mirrored wiki files
    │
    └──▶ Claude Code    — subagent per file (generate-wiki skill)
             │
             ▼
         wiki/*.md

After init/update:
    buildBacklinkIndex() → wiki/.setting/backlinks.json
    (used by update to auto-regenerate referencing wikis)

On demand (synthesize):
    collectWikiFiles() → chunkWikiFiles() → summarizeChunk() [LLM]
         │
         ▼
    wiki/_index.md          — full file list + tag index
    wiki/_architecture.md   — layer breakdown + Mermaid dependency graph
    wiki/_contradictions.md — detected contradictions across wiki pages
```

---

## State Files

bailey-wiki stores state and config under `<project>/wiki/.setting/`:

```
wiki/
├── hot.md        — hot cache: recent changes + architecture summary (auto-generated)
└── .setting/
    ├── config.json    — saved LLM/sources/concurrency settings (auto-generated)
    ├── state.json     — last processed commit
    ├── backlinks.json — reverse wikilink index (auto-built)
    └── prompt.md      — optional custom prompt appended to every LLM request
```

**state.json**

```json
{
  "lastCommit": "abc1234"
}
```

- `init` processes all files, skipping those whose wiki file already exists
- `update` processes only files changed between `lastCommit` and `HEAD`
- `regen --file <path>` always overwrites the wiki file for a specific source file
- Delete `wiki/.setting/state.json` to force full regeneration on next `update`
- Delete individual wiki `.md` files to force `init` to regenerate them

**config.json** is auto-saved after each run and read on the next run — no need to pass `--provider`, `--model`, etc. again once set.

---

## License

MIT
