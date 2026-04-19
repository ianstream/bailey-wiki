# bailey-wiki

**基于LLM的代码Wiki自动生成工具 — 支持Obsidian图谱**

自动分析源代码，生成支持Obsidian `[[wikilink]]` 图谱导航的Markdown Wiki文件。

**[English](README.md)** | **[한국어](README.ko.md)** | **[日本語](README.ja.md)** | **[Español](README.es.md)**

> 受 [Andrej Karpathy 的 LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)启发，专为代码库而设计：不同于个人知识库，bailey-wiki 从源代码中自动构建并维护一个持久、复利积累的Wiki。每次提交，知识都在增长。

---

## 主要功能

- **1:1 源码镜像** — Wiki文件与源码目录结构完全一致
- **Obsidian图谱** — `[[wikilink]]` 交叉引用自动构建依赖图谱
- **真实依赖解析** — 解析实际import语句，而非仅匹配文件名
- **Mermaid图表** — 自动生成状态机、时序流程、类关系图
- **增量更新** — `update` 命令通过 `git diff` 只处理变更文件
- **反向链接索引** — `update` 自动重新生成通过 `[[wikilink]]` 引用变更文件的Wiki
- **Wiki合成** — `synthesize` 将整个Wiki编译为 `_index.md`、`_architecture.md`、`_contradictions.md`
- **Wiki缓存** — 未变更文件自动跳过
- **AWS Bedrock后端** — 通过Bedrock推理配置文件支持Nova Micro/Lite/Pro、Claude Haiku/Sonnet
- **多语言输出** — Wiki内容支持韩语、英语、日语、中文或西班牙语（`--lang`）
- **Wiki检查** — `lint` 命令检测孤立Wiki、缺失Wiki、死链、路径不一致
- **Claude Code技能** — 使用 `generate-wiki` 技能通过Claude Code子代理生成Wiki（无需外部LLM）
- **TypeScript** — strict模式TypeScript源码，模块化架构，43个单元测试

---

## 安装

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install
npm run build   # TypeScript → dist/ 编译

# 可选：全局安装
npm link
```

**环境要求：** Node.js 18+，TypeScript（通过 `npm install` 自动安装）

### 开发

```bash
npm run dev     # 直接用 tsx 运行（无需构建）
npm test        # 运行 43 个单元测试
npm run build   # 编译到 dist/
```

---

## 使用方法

### 初次使用

**第一步：安装 bailey-wiki**

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install && npm run build
npm link   # 让 `bailey-wiki` 命令全局可用
```

**第二步：配置 AWS Bedrock**

```bash
aws configure --profile my-profile
# 输入 AWS 凭证
```

**第三步：初始化第一个仓库**

```bash
# 进入要文档化的仓库
cd ~/git/my-project

# 为所有源文件生成 Wiki（首次运行）
bailey-wiki init --project . --profile my-profile

# 查看生成结果
bailey-wiki status --project .
```

生成的 `wiki/` 目录与源码结构完全一致：
```
src/main/kotlin/com/example/OrderService.kt
→ wiki/src/main/kotlin/com/example/OrderService.md
```

**第四步：安装 git hook（提交时自动更新）**

```bash
bash /path/to/bailey-wiki/install-hook.sh ~/git/my-project
```

此后，每次包含源文件变更的提交都会自动运行 `bailey-wiki update`。

---

### 日常工作流

完成初次 `init` 后的典型使用模式：

```bash
# 1. 正常修改代码并提交
git commit -m "feat: 添加支付重试逻辑"
# → post-commit hook 自动运行 bailey-wiki update

# 2. 定期检查 Wiki 健康状态（每 10~15 次提交）
bailey-wiki lint --project ~/git/my-project

# 3. 需要全局视图时运行合成
bailey-wiki synthesize --project ~/git/my-project
```

各命令的用途：

| 命令 | 运行时机 | 作用 |
|------|---------|------|
| `update` | 每次提交（hook 自动运行） | 重新生成变更文件及引用它的 Wiki |
| `lint` | 每 10~15 次提交 | 检测孤立 Wiki、死链、缺失 Wiki |
| `synthesize` | 每周或重大变更后 | 生成 `_index.md`、`_architecture.md`、`_contradictions.md`、`hot.md` |

---

### 管理多个仓库

bailey-wiki 采用**每个仓库独立 Wiki** 的设计。每个仓库都有独立的 `wiki/` 目录。

```
~/git/
├── my-server/
│   └── wiki/              ← 服务端 Wiki
│       ├── hot.md
│       ├── _index.md
│       ├── _architecture.md
│       └── src/...
├── my-frontend/
│   └── wiki/              ← 前端 Wiki（独立）
│       ├── hot.md
│       └── src/...
```

**同时初始化多个仓库：**

```bash
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --profile my-profile \
  --concurrency 8
```

**为每个仓库安装 hook：**

```bash
for repo in ~/git/my-server ~/git/my-frontend ~/git/my-api; do
  bash /path/to/bailey-wiki/install-hook.sh $repo
done
```

---

### 与 Claude Code 集成

将 Wiki 连接到 Claude Code，无需直接读取源文件即可回答有关代码库的问题。

**第一步：添加到项目的 `CLAUDE.md`**

```markdown
## Wiki 知识库

开始处理此代码库时：
1. 先读 `wiki/hot.md` — 最近变更 + 架构摘要（约30秒）
2. 需要更多上下文时读 `wiki/_index.md` — 完整文件列表 + 一行摘要
3. 架构概览读 `wiki/_architecture.md`
4. 之后再读单个 Wiki 页面或源文件

不要为了获取 Wiki 中已有的上下文而直接读取源文件。
```

**第二步：保持 Wiki 最新**

```bash
# 拉取最新变更后
git pull
bailey-wiki update --project .
```

**第三步：在 Claude Code 中提问**

```
"哪些文件负责支付处理？"
"OrderService 依赖哪些文件？"
"展示结账流程"
"最近有什么变化？"（hot.md）
"Wiki 中有矛盾内容吗？"（_contradictions.md）
```

**第四步：需要深度上下文时运行 synthesize**

```bash
# 重大变更后或每周运行
bailey-wiki synthesize --project ~/git/my-project
```

`hot.md`、`_index.md`、`_architecture.md`、`_contradictions.md` 将更新到最新状态，让 Claude Code 始终掌握代码库的最新全貌。

---

## 快速开始

```bash
# 分析整个项目（默认使用Nova Lite）
bailey-wiki init --project ~/git/my-project --profile my-aws-profile

# 更高质量
bailey-wiki init --project ~/git/my-project \
  --profile my-aws-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0

# 只更新上次运行后变更的文件
bailey-wiki update --project ~/git/my-project

# 查看状态
bailey-wiki status --project ~/git/my-project
```

---

## 配置

配置存储在 `wiki/.setting/config.json`。首次运行时自动保存，也可手动创建：

```json
{
  "language": "zh",
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

### 环境变量

```env
BAILEY_WIKI_LANG=zh          # ko | en | ja | zh | es（默认：ko）
BAILEY_WIKI_MODEL=apac.amazon.nova-lite-v1:0
BAILEY_WIKI_AWS_PROFILE=my-profile
BAILEY_WIKI_AWS_REGION=ap-northeast-2
BAILEY_WIKI_PROJECT=/path/to/project
BAILEY_WIKI_CONCURRENCY=3
```

### 支持的语言

| 代码 | 语言 |
|------|------|
| `ko` | 韩语（한국어）— 默认 |
| `en` | 英语（English） |
| `ja` | 日语（日本語） |
| `zh` | 简体中文 |
| `es` | 西班牙语（Español） |

---

## CLI 参考

```
bailey-wiki <command> [options]

Commands:
  init        为所有源文件生成Wiki（若Wiki已存在则跳过）
  update      更新上次git提交后变更文件的Wiki
  regen       强制重新生成指定文件的Wiki
  status      显示项目状态
  config      输出当前配置
  synthesize  将整个Wiki合成为 _index.md、_architecture.md、_contradictions.md
  lint        检查Wiki健康状态：孤立Wiki、缺失Wiki、死链、路径不一致

Options:
  --project <path>     目标项目目录（可重复用于多项目）
  --model <id>         Bedrock推理配置文件ID（默认：apac.amazon.nova-lite-v1:0）
  --concurrency <n>    并发LLM槽位总数（默认：CPU核心数）
  --profile <name>     AWS配置文件名（默认：default）
  --region <name>      AWS区域（默认：ap-northeast-2）
  --lang <code>        Wiki语言：ko | en | ja | zh | es（默认：ko）
  --from <commit>      （仅update）覆盖基准提交而非使用上次运行
  --file <path>        （仅regen）要重新生成的源文件
```

### 示例

```bash
# 单项目
bailey-wiki init --project ~/git/my-project --profile my-profile --lang zh

# 多项目并行
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --concurrency 6

# 增量更新
bailey-wiki update --project ~/git/my-project

# 重新生成单个文件
bailey-wiki regen --project ~/git/my-project --file ~/git/my-project/src/Service.kt

# 合成整个Wiki
bailey-wiki synthesize --project ~/git/my-project

# 检查Wiki健康状态
bailey-wiki lint --project ~/git/my-project

# 推荐工作流
bailey-wiki update --project ~/git/my-project
bailey-wiki lint --project ~/git/my-project
bailey-wiki synthesize --project ~/git/my-project
```

---

## AWS Bedrock 配置

### 支持的推理配置文件

| 配置文件ID | 模型 | 费用（每百万token 输入/输出） |
|---|---|---|
| `apac.amazon.nova-micro-v1:0` | Nova Micro | $0.035 / $0.14 |
| `apac.amazon.nova-lite-v1:0` | Nova Lite | $0.06 / $0.24 |
| `apac.amazon.nova-pro-v1:0` | Nova Pro | $0.80 / $3.20 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | $0.08 / $0.40 |
| `global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 / $15.00 |

### AWS凭证

```bash
aws configure --profile my-profile
```

### 所需IAM权限

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## Wiki输出

### 目录结构

```
src/main/kotlin/com/example/PurchaseService.kt
→ wiki/src/main/kotlin/com/example/PurchaseService.md
```

### 合成文档（由 `synthesize` 生成）

| 文件 | 内容 |
|------|------|
| `wiki/hot.md` | 热缓存 — 最近变更 + 架构摘要（新会话时优先阅读） |
| `wiki/_index.md` | 完整文件列表 + 一行摘要 + 标签索引 |
| `wiki/_architecture.md` | 层次/领域分解、依赖流程、Mermaid图谱 |
| `wiki/_contradictions.md` | 检测到的Wiki页面间矛盾 |

---

## Obsidian 集成

1. Obsidian → **以文件夹作为仓库打开** → 选择 `wiki/`
2. 启用**图谱视图** → 可视化文件依赖关系
3. `[[wikilinks]]` 自动连接相关文件

---

## 许可证

MIT
