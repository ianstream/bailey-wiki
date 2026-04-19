import { execSync } from 'node:child_process';
import path from 'node:path';

export function getHeadCommit(projectPath: string): string | null {
  try {
    return execSync('git rev-parse HEAD', { cwd: projectPath }).toString().trim();
  } catch {
    return null;
  }
}

const COMMIT_RE = /^[0-9a-f]{4,40}$/i;

export function getChangedFiles(projectPath: string, sinceCommit: string): string[] {
  if (!COMMIT_RE.test(sinceCommit)) {
    throw new Error(`Invalid commit hash: ${sinceCommit}`);
  }
  try {
    const out = execSync(`git diff --name-only ${sinceCommit} HEAD`, { cwd: projectPath })
      .toString()
      .trim();
    return out ? out.split('\n').map((f) => path.join(projectPath, f)) : [];
  } catch {
    return [];
  }
}
