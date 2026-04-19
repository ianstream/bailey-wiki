# bailey-wiki

**LLM 기반 코드 위키 자동 생성기 — Obsidian 그래프 지원**

소스 코드를 자동으로 분석하여 Obsidian `[[wikilink]]` 그래프 탐색이 가능한 마크다운 위키를 생성합니다.

**[English](README.md)** | **[日本語](README.ja.md)** | **[中文](README.zh.md)** | **[Español](README.es.md)**

> [Andrej Karpathy의 LLM Wiki 패턴](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)에서 영감을 받아 코드베이스에 적용했습니다. 개인 지식베이스 대신, bailey-wiki는 소스 코드로부터 영속적이고 복리적으로 쌓이는 위키를 자동으로 구축·유지합니다. 커밋할수록 지식이 쌓입니다.

---

## 주요 기능

- **소스 경로 1:1 미러링** — 소스와 동일한 디렉토리 구조로 wiki 생성
- **Obsidian 그래프** — `[[wikilink]]` 기반 의존관계 그래프 자동 구성
- **실제 의존관계 파싱** — import 구문 분석으로 실제 참조 관계 반영
- **Mermaid 다이어그램** — 상태머신, 시퀀스, 클래스 다이어그램 자동 생성
- **증분 업데이트** — `git diff` 기반으로 변경된 파일만 처리
- **위키 파일 캐시** — 위키 파일이 이미 존재하는 파일은 자동 스킵
- **AWS Bedrock 백엔드** — Bedrock 추론 프로파일을 통한 Nova Micro/Lite/Pro, Claude Haiku/Sonnet 지원
- **TypeScript** — strict 모드 TypeScript 소스, 모듈형 아키텍처, 43개 유닛 테스트

---

## 설치

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install
npm run build   # TypeScript → dist/ 컴파일

# 선택: 전역 설치
npm link
```

**요구사항:** Node.js 18+, TypeScript (`npm install`로 자동 설치)

### 개발

```bash
npm run dev     # tsx로 바로 실행 (빌드 불필요)
npm test        # 43개 유닛 테스트 실행
npm run build   # dist/ 컴파일
```

---

## 사용 방법

### 처음 시작하기

**1단계: bailey-wiki 설치**

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install && npm run build
npm link   # `bailey-wiki` 명령어를 전역으로 사용 가능하게 함
```

**2단계: AWS Bedrock 설정**

```bash
aws configure --profile my-profile
# AWS 자격증명 입력
```

**3단계: 첫 레포 초기화**

```bash
# 문서화할 레포로 이동
cd ~/git/my-project

# 전체 소스 파일 위키 생성 (최초 1회)
bailey-wiki init --project . --profile my-profile

# 생성 결과 확인
bailey-wiki status --project .
```

소스 구조와 동일한 `wiki/` 디렉토리가 생성됩니다:
```
src/main/kotlin/com/example/OrderService.kt
→ wiki/src/main/kotlin/com/example/OrderService.md
```

**4단계: git hook 설치 (커밋 시 자동 업데이트)**

```bash
bash /path/to/bailey-wiki/install-hook.sh ~/git/my-project
```

이제부터 소스 파일이 변경된 커밋마다 `bailey-wiki update`가 자동으로 실행됩니다.

---

### 일상적인 워크플로우

최초 `init` 이후의 일반적인 사용 패턴:

```bash
# 1. 평소처럼 코드 변경 후 커밋
git commit -m "feat: 결제 재시도 로직 추가"
# → post-commit hook이 자동으로 bailey-wiki update 실행

# 2. 주기적으로 위키 상태 확인 (10~15 커밋마다)
bailey-wiki lint --project ~/git/my-project

# 3. 전체 구조를 파악해야 할 때 합성 실행
bailey-wiki synthesize --project ~/git/my-project
```

각 명령어의 역할:

| 명령어 | 실행 시점 | 역할 |
|--------|----------|------|
| `update` | 커밋마다 (hook 자동 실행) | 변경 파일 + 연관 위키 재생성 |
| `lint` | 10~15 커밋마다 | 고아 위키, 데드링크, 누락 위키 감지 |
| `synthesize` | 주 1회 또는 대규모 변경 후 | `_index.md`, `_architecture.md`, `_contradictions.md`, `hot.md` 생성 |

---

### 여러 레포 관리

bailey-wiki는 **레포별 독립 위키** 구조로 설계되어 있습니다. 각 레포에 독립적인 `wiki/` 디렉토리가 생성됩니다.

```
~/git/
├── my-server/
│   └── wiki/              ← 서버 위키
│       ├── hot.md
│       ├── _index.md
│       ├── _architecture.md
│       └── src/...
├── my-frontend/
│   └── wiki/              ← 프론트엔드 위키 (독립)
│       ├── hot.md
│       └── src/...
```

**여러 레포 동시 초기화:**

```bash
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --profile my-profile \
  --concurrency 8
```

**각 레포에 hook 설치:**

```bash
for repo in ~/git/my-server ~/git/my-frontend ~/git/my-api; do
  bash /path/to/bailey-wiki/install-hook.sh $repo
done
```

---

### Claude Code 연동

위키를 Claude Code에 연결하면 소스 파일을 직접 읽지 않고도 코드베이스에 대한 질문에 답할 수 있습니다.

**1단계: 프로젝트 `CLAUDE.md`에 추가**

```markdown
## Wiki 지식베이스

이 코드베이스 작업 시작 시:
1. `wiki/hot.md` 먼저 읽기 — 최근 변경사항 + 아키텍처 요약 (~30초)
2. 더 필요하면 `wiki/_index.md` — 전체 파일 목록 + 한줄 요약
3. 아키텍처 개요는 `wiki/_architecture.md`
4. 그 다음에만 개별 위키 파일이나 소스 파일을 읽을 것

위키에서 얻을 수 있는 컨텍스트를 위해 소스 파일을 직접 읽지 말 것.
```

**2단계: 위키 최신 상태 유지**

```bash
# 최신 변경사항 pull 후
git pull
bailey-wiki update --project .
```

**3단계: Claude Code에서 질문하기**

```
"결제 처리를 담당하는 파일이 어떤 건가요?"
"OrderService가 의존하는 파일은 무엇인가요?"
"체크아웃 흐름을 보여주세요"
"최근에 뭐가 바뀌었나요?" (hot.md)
"위키에 모순된 내용이 있나요?" (_contradictions.md)
```

**4단계: 심층 컨텍스트가 필요할 때 synthesize 실행**

```bash
# 대규모 변경 후 또는 주 1회
bailey-wiki synthesize --project ~/git/my-project
```

`hot.md`, `_index.md`, `_architecture.md`, `_contradictions.md`가 최신 상태로 갱신되어 Claude Code가 코드베이스를 항상 최신 상태로 파악할 수 있습니다.

---

## 빠른 시작

### 로컬 LLM 프록시

```bash
# 프로젝트 전체 분석
bailey-wiki init --project ~/git/my-project

# 마지막 실행 이후 변경분만 업데이트
bailey-wiki update --project ~/git/my-project

# 현재 상태 확인
bailey-wiki status --project ~/git/my-project
```

### AWS Bedrock

```bash
# Nova Lite (권장 — 품질/비용 균형)
bailey-wiki init --project ~/git/my-project \
  --provider bedrock \
  --profile my-aws-profile \
  --model apac.amazon.nova-lite-v1:0

# Claude Haiku 4.5 (저비용 중 최고 품질)
bailey-wiki init --project ~/git/my-project \
  --provider bedrock \
  --profile my-aws-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0
```

---

## 설정

설정은 `wiki/.setting/config.json`에 저장됩니다. 첫 실행 시 자동 저장되며, 수동으로 생성할 수도 있습니다:

```json
{
  "language": "ko",
  "llm": {
    "model": "apac.amazon.nova-lite-v1:0",
    "bedrock": {
      "profile": "my-aws-profile",
      "region": "us-east-1"
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

### 환경변수

```env
BAILEY_WIKI_LANG=ko
BAILEY_WIKI_MODEL=apac.amazon.nova-lite-v1:0
BAILEY_WIKI_AWS_PROFILE=my-profile
BAILEY_WIKI_AWS_REGION=us-east-1
BAILEY_WIKI_PROJECT=/path/to/project
BAILEY_WIKI_CONCURRENCY=3
```

### 지원 언어

| 코드 | 언어 |
|------|------|
| `ko` | 한국어 — 기본값 |
| `en` | English |
| `ja` | 日本語 |
| `zh` | 简体中文 |
| `es` | Español |

---

## CLI 레퍼런스

```
bailey-wiki <command> [options]

Commands:
  init     전체 소스 파일 위키 생성 (위키 파일이 이미 있으면 스킵)
  update   마지막 git 커밋 이후 변경된 파일만 위키 업데이트
  regen    특정 파일의 위키를 강제 재생성 (항상 덮어씀)
  status   프로젝트 상태 출력 (소스, 위키 페이지, LLM 정보)
  config   현재 적용된 설정 출력
  synthesize  전체 위키를 _index.md, _architecture.md, _contradictions.md로 합성

Options:
  --project <path>     대상 프로젝트 경로 (여러 번 사용 가능)
  --model <id>         Bedrock 추론 프로파일 ID (기본값: apac.amazon.nova-lite-v1:0)
  --concurrency <n>    동시 LLM 호출 수 (기본값: CPU 코어 수)
  --profile <name>     AWS 프로파일 이름 (기본값: default)
  --region <name>      AWS 리전 (기본값: us-east-1)
  --lang <code>        위키 언어: ko | en | ja | zh | es (기본값: ko)
  --from <commit>      (update 전용) 마지막 실행 대신 지정 커밋부터 diff
  --file <path>        (regen 전용) 재생성할 소스 파일 경로
```

### 사용 예시

```bash
# 단일 프로젝트
bailey-wiki init --project ~/git/my-project --profile my-profile

# 다중 프로젝트 병렬 처리
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --concurrency 6

# 고품질 모델 지정
bailey-wiki init \
  --project ~/git/my-project \
  --profile my-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0

# Bedrock, 다중 프로젝트 병렬
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --provider bedrock \
  --profile prod \
  --model apac.amazon.nova-lite-v1:0 \
  --concurrency 10

# 실행 전 상태 확인
bailey-wiki status --project ~/git/my-project

# 커밋 후 증분 업데이트
bailey-wiki update --project ~/git/my-project

# 단일 파일 재생성
bailey-wiki regen --project ~/git/my-project --file ~/git/my-project/src/Service.kt

# 전체 위키 합성
bailey-wiki synthesize --project ~/git/my-project

# update 후 일반적인 워크플로우
bailey-wiki update --project ~/git/my-project
bailey-wiki synthesize --project ~/git/my-project
```

---

## AWS Bedrock 설정

### 1. 지원 inference profile

bailey-wiki는 raw 모델 ID가 아닌 **inference profile ID**를 사용해야 합니다:

| Profile ID | 모델 | 비용 (입력/출력 1M 토큰) |
|---|---|---|
| `apac.amazon.nova-micro-v1:0` | Nova Micro | $0.035 / $0.14 |
| `apac.amazon.nova-lite-v1:0` | Nova Lite | $0.06 / $0.24 |
| `apac.amazon.nova-pro-v1:0` | Nova Pro | $0.80 / $3.20 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | $0.08 / $0.40 |
| `global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 / $15.00 |

> 계정에서 사용 가능한 전체 목록: `aws bedrock list-inference-profiles --type-equals SYSTEM_DEFINED`

### 2. AWS 자격증명

```bash
aws configure --profile my-profile
```

또는 IAM 역할 / 환경변수(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) 사용.

### 3. 필요 IAM 권한

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## 위키 출력 구조

### 디렉토리 구조

소스 파일이 `wiki/`에 1:1로 미러링됩니다:

```
src/main/kotlin/com/example/PurchaseService.kt
→ wiki/src/main/kotlin/com/example/PurchaseService.md
```

### 합성 문서 (`synthesize`로 생성)

| 파일 | 내용 |
|------|------|
| `wiki/_index.md` | 전체 파일 목록, 한 줄 요약, 태그 인덱스 |
| `wiki/_architecture.md` | 레이어/도메인 구조, 의존 흐름, Mermaid 그래프 |
| `wiki/_contradictions.md` | 위키 간 모순/불일치 감지 결과 |

### 생성되는 문서 구조

```markdown
---
type: source
title: <설명적인 제목>
path: <소스 파일 경로>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [domain, layer, ...]
related: [ClassName, AnotherClass]
---

## Overview
파일이 하는 일 2-3문장 요약.

## Responsibilities
- 주요 책임 1
- 주요 책임 2

## Key Business Logic
중요한 로직/규칙/정책을 테이블, 결정 트리, 코드 스니펫으로 정리.
API 메서드 테이블 (HTTP 메서드, 경로, 요청/응답 타입) 포함.

## State / Flow
상태머신, 시퀀스 다이어그램 (해당하는 경우 Mermaid로 자동 생성).

## Dependencies
- [[RelatedClass]] — Obsidian 그래프용 wikilink
- [[AnotherClass]]

## Open Questions
불명확한 사항 또는 사람이 검토해야 할 내용.
```

---

## Obsidian 통합

### 1. Vault로 열기

생성된 `wiki/` 폴더를 **Obsidian Vault**로 엽니다:

1. Obsidian → **Open folder as vault** → `wiki/` 선택
2. **Graph View** 활성화 → 파일 의존관계 시각화
3. `[[wikilinks]]`로 관련 파일 자동 연결

### 2. Claude Desktop MCP 연동 (권장)

Claude Desktop을 Obsidian vault에 연결하면 Claude가 생성된 wiki를 기반으로 **코드베이스에 대한 질문에 직접 답변**할 수 있습니다.

**Obsidian에 Local REST API 플러그인 설치:**

1. Obsidian → Settings → Community plugins → Browse → `Local REST API` 검색
2. 설치 및 활성화
3. 플러그인 설정으로 이동 → **API Key** 복사

**Claude Desktop MCP 설정** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uvx",
      "args": ["mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "여기에-api-key-입력"
      }
    }
  }
}
```

> **요구사항:** `uvx` — `pip install uv` 또는 `brew install uv`로 설치

**Claude Desktop 재시작** 후 Claude가 vault에 직접 접근할 수 있습니다.

### 3. 실제 사용 워크플로우

```
wiki 최초 생성:
  bailey-wiki init --project ~/git/my-project

Claude Desktop에서 질문:
  "결제 처리를 담당하는 파일이 어디야?"
  "CartService가 의존하는 파일은 뭐야?"
  "checkout 플로우 상태머신 보여줘"
  "최근에 변경된 파일들은?" (update로 최신 상태 유지)
```

Claude가 wiki 페이지를 검색하고 Mermaid 다이어그램과 의존관계 링크를 읽어 문서 기반으로 답변합니다. 코드를 직접 붙여넣을 필요가 없습니다.

**커밋 후 wiki 최신화:**

```bash
# git pull 또는 새 커밋 후
bailey-wiki update --project ~/git/my-project

# 특정 커밋부터 재처리
bailey-wiki update --project ~/git/my-project --from abc1234
```

---

## 멀티 프로젝트 워크플로우

```bash
# 서버 + 프론트엔드 동시 처리
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --concurrency 8

# 동시성은 프로젝트 수로 균등 분배: 8 / 2 = 프로젝트당 4 슬롯
```

---

## CI/CD 통합

main 브랜치 머지 시 자동 위키 업데이트:

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

## 상태 파일

bailey-wiki는 `<project>/wiki/.setting/` 하위에 상태와 설정을 저장합니다:

```
wiki/.setting/
├── state.json    — 마지막 처리 커밋
├── config.json   — LLM/소스/동시성 설정 저장 (자동 생성)
└── prompt.md     — 모든 LLM 요청에 추가되는 커스텀 프롬프트 (선택)
```

**state.json**

```json
{
  "lastCommit": "abc1234"
}
```

- `init` — 위키 파일이 이미 존재하면 스킵
- `update` — `lastCommit`과 `HEAD` 사이의 변경 파일만 처리
- `regen --file <path>` — 특정 소스 파일의 위키를 항상 덮어씀
- `update` 전체 재실행이 필요하면 `wiki/.setting/state.json` 삭제
- `init` 재생성이 필요하면 개별 위키 `.md` 파일 삭제

**config.json**은 매 실행 후 자동 저장되고 다음 실행 시 먼저 읽힙니다 — 한 번 설정하면 `--provider`, `--model` 등을 다시 지정할 필요 없습니다.

---

## 라이선스

MIT
