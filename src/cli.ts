#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { loadEnv } from './utils/env-loader.js';
import { loadConfig } from './config/config.js';
import { log, err, C } from './utils/logger.js';
import { cmdInit } from './commands/init.js';
import { cmdUpdate } from './commands/update.js';
import { cmdStatus } from './commands/status.js';
import { cmdConfig } from './commands/config.js';
import { cmdLint } from './commands/lint.js';
import { cmdSynthesize } from './commands/synthesize.js';
import { cmdList } from './commands/list.js';
import { cmdRegen } from './commands/regen.js';
import type { ConfigOverrides } from './types.js';

const CPU_COUNT = os.cpus().length;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const cliDir = path.dirname(new URL(import.meta.url).pathname);
  await loadEnv(cliDir);
  await loadEnv(process.cwd());

  if (!command || command === '--help' || command === '-h') {
    console.log(`
${C.bold('bailey-wiki')} — LLM-powered code wiki with Obsidian graph support

${C.dim('Usage:')}
  bailey-wiki init       [options]   Generate wiki for all source files
  bailey-wiki update     [options]   Update wiki for files changed since last run
  bailey-wiki synthesize [options]   Synthesize entire wiki into _index.md, _architecture.md, _contradictions.md
  bailey-wiki lint       [options]   Check wiki health: orphans, missing wikis, dead links, stale paths
  bailey-wiki regen      --file <path> [options]   Regenerate wiki for a specific file
  bailey-wiki status     [options]   Show project status
  bailey-wiki config     [options]   Show resolved configuration

${C.dim('Options:')}
  --project <path>     Target project (repeatable for multiple projects)
  --model <id>         Bedrock inference profile ID (default: apac.amazon.nova-lite-v1:0)
  --concurrency <n>    Total parallel slots — split across projects (default: CPU cores)
  --profile <name>     AWS profile (default: default)
  --region <name>      AWS region (default: ap-northeast-2)
  --lang <code>        Wiki language: ko | en | ja | zh | es (default: ko)
  --from <commit>      (update only) Override baseline commit hash instead of using last run

${C.dim('Config (in target project):')}
  wiki/.setting/config.json   Settings (auto-saved after first run)
  .env                        Environment variable overrides

${C.dim('Config example (wiki/.setting/config.json):')}
  {
    "llm": {
      "model": "apac.amazon.nova-lite-v1:0",
      "bedrock": { "profile": "myprofile", "region": "ap-northeast-2" }
    }
  }

${C.dim('Examples:')}
  bailey-wiki init --project ~/git/my-project
  bailey-wiki init --project ~/git/server --profile my-profile --model apac.amazon.nova-lite-v1:0
  bailey-wiki update --project ~/git/server --project ~/git/frontend
  bailey-wiki status --project ~/git/server
  bailey-wiki init --concurrency 6 --project ~/git/server --project ~/git/frontend
`);
    return;
  }

  // Parse common options
  const modelIdx   = args.indexOf('--model');
  const ccIdx      = args.indexOf('--concurrency');
  const profileIdx = args.indexOf('--profile');
  const regionIdx  = args.indexOf('--region');
  const langIdx    = args.indexOf('--lang');
  const fromIdx    = args.indexOf('--from');

  // Collect all --project values (multiple allowed)
  const projectPaths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectPaths.push(path.resolve(args[i + 1]));
      i++;
    }
  }
  if (projectPaths.length === 0) {
    const envProject = process.env['BAILEY_WIKI_PROJECT'];
    projectPaths.push(envProject ? path.resolve(envProject) : process.cwd());
  }

  const manualConcurrency = ccIdx >= 0 ? parseInt(args[ccIdx + 1]) : undefined;
  const totalConcurrency = manualConcurrency ?? CPU_COUNT;
  // Distribute concurrency evenly across projects (min 1 each)
  const perProject = Math.max(1, Math.floor(totalConcurrency / projectPaths.length));

  log(`CPU cores: ${CPU_COUNT} | Projects: ${projectPaths.length} | Concurrency per project: ${perProject}`);
  console.log();

  const overrides: ConfigOverrides = {
    model:       modelIdx   >= 0 ? args[modelIdx + 1]   : undefined,
    concurrency: manualConcurrency ? perProject : undefined,
    profile:     profileIdx >= 0 ? args[profileIdx + 1] : undefined,
    region:      regionIdx  >= 0 ? args[regionIdx + 1]  : undefined,
    language:    langIdx    >= 0 ? args[langIdx + 1]    : undefined,
  };

  const configs = await Promise.all(
    projectPaths.map(async (projectPath) => {
      await loadEnv(projectPath);
      return loadConfig(projectPath, { ...overrides, project: projectPath });
    })
  );

  const fromCommit = fromIdx >= 0 ? args[fromIdx + 1] : undefined;

  const fileIdx = args.indexOf('--file');
  const targetFile = fileIdx >= 0 ? path.resolve(args[fileIdx + 1]) : undefined;

  switch (command) {
    case 'init':
      await Promise.all(configs.map((cfg) => cmdInit(cfg)));
      break;
    case 'update':
      await Promise.all(configs.map((cfg) => cmdUpdate(cfg, fromCommit)));
      break;
    case 'status':
      for (const cfg of configs) await cmdStatus(cfg);
      break;
    case 'config':
      for (const cfg of configs) await cmdConfig(cfg);
      break;
    case 'list':
      for (const cfg of configs) await cmdList(cfg);
      break;
    case 'synthesize':
      await Promise.all(configs.map((cfg) => cmdSynthesize(cfg)));
      break;
    case 'lint':
      for (const cfg of configs) await cmdLint(cfg);
      break;
    case 'regen': {
      if (!targetFile) {
        err('--file <path> is required for regen');
        process.exit(1);
      }
      for (const cfg of configs) await cmdRegen(cfg, targetFile);
      break;
    }
    default:
      err(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((e: unknown) => {
  err(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
