# bailey-wiki

**LLMによるコードWiki自動生成ツール — Obsidianグラフ対応**

ソースコードを自動解析し、Obsidian `[[wikilink]]` グラフ対応のMarkdownドキュメントを生成します。

**[English](README.md)** | **[한국어](README.ko.md)** | **[中文](README.zh.md)** | **[Español](README.es.md)**

> [Andrej Karpathyのキャラクター](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)のLLM Wikiパターンにインスピレーションを受け、コードベース向けに応用しました。個人の知識ベースではなく、bailey-wikiはソースコードから持続的・複利的に蓄積されるwikiを自動構築・維持します。コミットするたびに知識が積み重なります。

---

## 主な機能

- **ソースパスの1:1ミラーリング** — ソースと同一のディレクトリ構造でwikiを生成
- **Obsidianグラフ** — `[[wikilink]]` による依存関係グラフの自動構築
- **実際の依存関係解析** — import文を解析して実際の参照関係を反映
- **Mermaidダイアグラム** — ステートマシン、シーケンス、クラス図の自動生成
- **差分更新** — `git diff` ベースで変更ファイルのみ処理
- **Wikiファイルキャッシュ** — wikiファイルが既に存在するファイルを自動スキップ
- **AWS Bedrockバックエンド** — Bedrock推論プロファイルによるNova Micro/Lite/Pro、Claude Haiku/Sonnetのサポート
- **TypeScript** — strictモードのTypeScriptソース、モジュール型アーキテクチャ、43のユニットテスト

---

## インストール

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install
npm run build   # TypeScript → dist/ にコンパイル

# グローバルインストール（任意）
npm link
```

**要件:** Node.js 18+、TypeScript（`npm install` で自動インストール）

### 開発

```bash
npm run dev     # tsxで直接実行（ビルド不要）
npm test        # 43個のユニットテストを実行
npm run build   # dist/ にコンパイル
```

---

## 使い方

### はじめて使う場合

**ステップ1: bailey-wikiをインストール**

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install && npm run build
npm link   # `bailey-wiki` コマンドをグローバルに使えるようにする
```

**ステップ2: AWS Bedrockを設定**

```bash
aws configure --profile my-profile
# AWSの認証情報を入力
```

**ステップ3: 最初のリポジトリを初期化**

```bash
# ドキュメント化したいリポジトリに移動
cd ~/git/my-project

# 全ソースファイルのWikiを生成（初回のみ）
bailey-wiki init --project . --profile my-profile

# 生成結果を確認
bailey-wiki status --project .
```

ソース構造と同じ `wiki/` ディレクトリが生成されます:
```
src/main/kotlin/com/example/OrderService.kt
→ wiki/src/main/kotlin/com/example/OrderService.md
```

**ステップ4: gitフックをインストール（コミット時に自動更新）**

```bash
bash /path/to/bailey-wiki/install-hook.sh ~/git/my-project
```

以降、ソースファイルが変更されたコミットごとに `bailey-wiki update` が自動実行されます。

---

### 日常的なワークフロー

最初の `init` 以降の典型的な使い方:

```bash
# 1. 通常通りコード変更してコミット
git commit -m "feat: 決済リトライロジックを追加"
# → post-commitフックが自動でbailey-wiki updateを実行

# 2. 定期的にWikiの状態を確認（10〜15コミットごと）
bailey-wiki lint --project ~/git/my-project

# 3. 全体構成を把握したいときに合成を実行
bailey-wiki synthesize --project ~/git/my-project
```

各コマンドの役割:

| コマンド | 実行タイミング | 役割 |
|----------|--------------|------|
| `update` | コミットごと（フックで自動実行） | 変更ファイル＋参照Wikiを再生成 |
| `lint` | 10〜15コミットごと | 孤立Wiki、デッドリンク、不足Wikiを検出 |
| `synthesize` | 週1回または大規模変更後 | `_index.md`、`_architecture.md`、`_contradictions.md`、`hot.md`を生成 |

---

### 複数リポジトリの管理

bailey-wikiは**リポジトリ別独立Wiki**構造で設計されています。各リポジトリに独立した `wiki/` ディレクトリが生成されます。

```
~/git/
├── my-server/
│   └── wiki/              ← サーバーWiki
│       ├── hot.md
│       ├── _index.md
│       ├── _architecture.md
│       └── src/...
├── my-frontend/
│   └── wiki/              ← フロントエンドWiki（独立）
│       ├── hot.md
│       └── src/...
```

**複数リポジトリを同時に初期化:**

```bash
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --profile my-profile \
  --concurrency 8
```

**各リポジトリにフックをインストール:**

```bash
for repo in ~/git/my-server ~/git/my-frontend ~/git/my-api; do
  bash /path/to/bailey-wiki/install-hook.sh $repo
done
```

---

### Claude Codeとの連携

WikiをClaude Codeに接続すると、ソースファイルを直接読まずにコードベースについての質問に答えられます。

**ステップ1: プロジェクトの `CLAUDE.md` に追加**

```markdown
## Wikiナレッジベース

このコードベースでの作業開始時:
1. `wiki/hot.md` を最初に読む — 最近の変更＋アーキテクチャ概要（約30秒）
2. さらに必要なら `wiki/_index.md` — 全ファイル一覧＋一行サマリー
3. アーキテクチャ概要は `wiki/_architecture.md`
4. その後に個別のWikiページやソースファイルを読む

Wikiから得られるコンテキストのためにソースファイルを直接読まないこと。
```

**ステップ2: Wikiを最新に保つ**

```bash
# 最新の変更をpullした後
git pull
bailey-wiki update --project .
```

**ステップ3: Claude Codeで質問する**

```
「決済処理を担当するファイルはどれですか？」
「OrderServiceが依存しているファイルは？」
「チェックアウトフローを見せてください」
「最近何が変わりましたか？」（hot.md）
「Wikiに矛盾した内容はありますか？」（_contradictions.md）
```

**ステップ4: 深いコンテキストが必要なときはsynthesizeを実行**

```bash
# 大規模変更後または週1回
bailey-wiki synthesize --project ~/git/my-project
```

`hot.md`、`_index.md`、`_architecture.md`、`_contradictions.md` が最新状態に更新され、Claude Codeがコードベースを常に最新の状態で把握できます。

---

## クイックスタート

### ローカルLLMプロキシ

```bash
# プロジェクト全体を解析
bailey-wiki init --project ~/git/my-project

# 前回実行以降の変更分のみ更新
bailey-wiki update --project ~/git/my-project

# 現在の状態を確認
bailey-wiki status --project ~/git/my-project
```

### AWS Bedrock

```bash
# Nova Lite（推奨 — 品質/コストのバランス）
bailey-wiki init --project ~/git/my-project \
  --provider bedrock \
  --profile my-aws-profile \
  --model apac.amazon.nova-lite-v1:0

# Claude Haiku 4.5（低コストの中で最高品質）
bailey-wiki init --project ~/git/my-project \
  --provider bedrock \
  --profile my-aws-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0
```

---

## 設定

設定は `wiki/.setting/config.json` に保存されます。初回実行時に自動保存され、手動で作成することもできます:

```json
{
  "language": "ja",
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

### 環境変数

```env
BAILEY_WIKI_LANG=ja
BAILEY_WIKI_MODEL=apac.amazon.nova-lite-v1:0
BAILEY_WIKI_AWS_PROFILE=my-profile
BAILEY_WIKI_AWS_REGION=us-east-1
BAILEY_WIKI_PROJECT=/path/to/project
BAILEY_WIKI_CONCURRENCY=3
```

### 対応言語

| コード | 言語 |
|--------|------|
| `ko` | 한국어（韓国語）— デフォルト |
| `en` | English（英語） |
| `ja` | 日本語 |
| `zh` | 简体中文（中国語簡体字） |
| `es` | Español（スペイン語） |

---

## CLIリファレンス

```
bailey-wiki <command> [options]

Commands:
  init     全ソースファイルのwikiを生成（wikiファイルが既に存在する場合はスキップ）
  update   前回のgitコミット以降の変更ファイルのみwikiを更新
  regen    特定ファイルのwikiを強制再生成（常に上書き）
  status   プロジェクト状態を表示（ソース、wikiページ、LLM情報）
  config   現在適用されている設定を表示
  synthesize  Wikiを_index.md、_architecture.md、_contradictions.mdに合成

Options:
  --project <path>     対象プロジェクトのパス（複数回使用可能）
  --model <id>         Bedrock推論プロファイルID（デフォルト: apac.amazon.nova-lite-v1:0）
  --concurrency <n>    並列LLM呼び出し数（デフォルト: CPUコア数）
  --profile <name>     AWSプロファイル名（デフォルト: default）
  --region <name>      AWSリージョン（デフォルト: us-east-1）
  --lang <code>        Wiki言語: ko | en | ja | zh | es（デフォルト: ko）
  --from <commit>      （updateのみ）前回実行ではなく指定コミットからdiff
  --file <path>        （regenのみ）再生成するソースファイルのパス
```

### 使用例

```bash
# 単一プロジェクト
bailey-wiki init --project ~/git/my-project --profile my-profile

# 複数プロジェクトを並列処理
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --concurrency 6

# 高品質モデルを指定
bailey-wiki init \
  --project ~/git/my-project \
  --profile my-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0

# Bedrock、複数プロジェクト並列
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --provider bedrock \
  --profile prod \
  --model apac.amazon.nova-lite-v1:0 \
  --concurrency 10

# 実行前に状態確認
bailey-wiki status --project ~/git/my-project

# コミット後の差分更新
bailey-wiki update --project ~/git/my-project

# 単一ファイルの再生成
bailey-wiki regen --project ~/git/my-project --file ~/git/my-project/src/Service.kt

# Wiki全体を合成
bailey-wiki synthesize --project ~/git/my-project

# update後の典型的なワークフロー
bailey-wiki update --project ~/git/my-project
bailey-wiki synthesize --project ~/git/my-project
```

---

## AWS Bedrock セットアップ

### 1. サポートされているinference profile

bailey-wikiはraw モデルIDではなく **inference profile ID** を使用する必要があります:

| Profile ID | モデル | コスト（入力/出力 1Mトークン） |
|---|---|---|
| `apac.amazon.nova-micro-v1:0` | Nova Micro | $0.035 / $0.14 |
| `apac.amazon.nova-lite-v1:0` | Nova Lite | $0.06 / $0.24 |
| `apac.amazon.nova-pro-v1:0` | Nova Pro | $0.80 / $3.20 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | $0.08 / $0.40 |
| `global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 / $15.00 |

> アカウントで利用可能な全プロファイル: `aws bedrock list-inference-profiles --type-equals SYSTEM_DEFINED`

### 2. AWS認証情報

```bash
aws configure --profile my-profile
```

またはIAMロール / 環境変数（`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`）を使用。

### 3. 必要なIAM権限

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## Wiki出力構造

### ディレクトリ構造

ソースファイルが `wiki/` に1:1でミラーリングされます:

```
src/main/kotlin/com/example/PurchaseService.kt
→ wiki/src/main/kotlin/com/example/PurchaseService.md
```

### 合成ドキュメント（`synthesize`で生成）

| ファイル | 内容 |
|----------|------|
| `wiki/_index.md` | 全ファイル一覧・一行要約・タグインデックス |
| `wiki/_architecture.md` | レイヤー/ドメイン構成・依存フロー・Mermaidグラフ |
| `wiki/_contradictions.md` | Wiki間の矛盾・不整合の検出結果 |

### 生成されるドキュメント構造

```markdown
---
type: source
title: <説明的なタイトル>
path: <ソースファイルパス>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [domain, layer, ...]
related: [ClassName, AnotherClass]
---

## Overview
ファイルの概要（2〜3文）。

## Responsibilities
- 主要な責務1
- 主要な責務2

## Key Business Logic
重要なロジック/ルール/ポリシーをテーブル、決定木、コードスニペットで整理。
APIメソッドテーブル（HTTPメソッド、パス、リクエスト/レスポンス型）を含む。

## State / Flow
ステートマシン、シーケンスダイアグラム（該当する場合にMermaidで自動生成）。

## Dependencies
- [[RelatedClass]] — Obsidianグラフ用wikilink
- [[AnotherClass]]

## Open Questions
不明点や人間がレビューすべき内容。
```

---

## Obsidian統合

### 1. Vaultとして開く

生成された `wiki/` フォルダを **Obsidian Vault** として開きます:

1. Obsidian → **Open folder as vault** → `wiki/` を選択
2. **Graph View** を有効化 → ファイル依存関係を可視化
3. `[[wikilinks]]` で関連ファイルが自動接続

### 2. Claude Desktop MCP連携（推奨）

Claude DesktopをObsidian vaultに接続すると、Claudeが生成されたwikiを基に**コードベースへの質問に直接回答**できます。

**ObsidianにLocal REST APIプラグインをインストール:**

1. Obsidian → Settings → Community plugins → Browse → `Local REST API` を検索
2. インストールして有効化
3. プラグイン設定 → **API Key** をコピー

**Claude Desktop MCP設定** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "uvx",
      "args": ["mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "ここにapi-keyを入力"
      }
    }
  }
}
```

> **要件:** `uvx` — `pip install uv` または `brew install uv` でインストール

**Claude Desktopを再起動**するとClaudeがvaultに直接アクセスできます。

### 3. 実際の使用ワークフロー

```
wikiを初回生成:
  bailey-wiki init --project ~/git/my-project

Claude Desktopで質問:
  "決済処理を担当するファイルはどれ?"
  "CartServiceが依存するファイルは?"
  "checkoutフローのステートマシンを見せて"
  "最近変更されたファイルは?" (updateで最新状態を維持)
```

Claudeがwikiページを検索してMermaidダイアグラムと依存リンクを読み、ドキュメントベースで回答します。コードを手動で貼り付ける必要はありません。

**コミット後にwikiを最新化:**

```bash
# git pullや新しいコミット後
bailey-wiki update --project ~/git/my-project

# 特定のコミットから再処理
bailey-wiki update --project ~/git/my-project --from abc1234
```

---

## マルチプロジェクトワークフロー

```bash
# サーバー + フロントエンドを同時処理
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --concurrency 8

# 並列数はプロジェクト数で均等分配: 8 / 2 = プロジェクトあたり4スロット
```

---

## CI/CD統合

mainブランチへのマージ時にwikiを自動更新:

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

## 状態ファイル

bailey-wikiは `<project>/wiki/.setting/` 以下に状態と設定を保存します:

```
wiki/.setting/
├── state.json    — 最終処理コミット
├── config.json   — LLM/ソース/並列数設定の保存（自動生成）
└── prompt.md     — 全LLMリクエストに追加されるカスタムプロンプト（任意）
```

**state.json**

```json
{
  "lastCommit": "abc1234"
}
```

- `init` — wikiファイルが既に存在するファイルをスキップ
- `update` — `lastCommit` と `HEAD` の差分ファイルのみ処理
- `regen --file <path>` — 特定ソースファイルのwikiを常に上書き
- `update` を強制再実行するには `wiki/.setting/state.json` を削除
- `init` で再生成するには個別のwiki `.md` ファイルを削除

**config.json** は毎回の実行後に自動保存され、次回実行時に優先読み込みされます — 一度設定すれば `--provider`、`--model` などを再指定する必要はありません。

---

## ライセンス

MIT
