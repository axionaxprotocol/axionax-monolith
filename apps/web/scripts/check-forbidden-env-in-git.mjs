#!/usr/bin/env node
/**
 * Blocks commits/pushes that include sensitive env files.
 * Usage:
 *   node scripts/check-forbidden-env-in-git.mjs commit
 *   node scripts/check-forbidden-env-in-git.mjs push
 */
import { execSync } from 'node:child_process';

const mode = process.argv[2] ?? 'commit';

function isForbiddenPath(relPath) {
  const n = String(relPath).replace(/\\/g, '/');
  if (/(^|\/)\.env\.local$/.test(n)) return true;
  if (/(^|\/)\.env\.[^/]+\.local$/.test(n)) return true;
  if (/(^|\/)\.env$/.test(n)) return true;
  return false;
}

function git(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function lines(s) {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

let paths = [];

if (mode === 'commit') {
  const out = git('git diff --cached --name-only --diff-filter=ACM');
  paths = lines(out);
} else if (mode === 'push') {
  const upstream = git('git rev-parse --abbrev-ref @{u}');
  if (!upstream) process.exit(0);
  const out = git(`git diff --name-only ${upstream}...HEAD`);
  paths = lines(out);
} else {
  console.error('Usage: node scripts/check-forbidden-env-in-git.mjs commit|push');
  process.exit(2);
}

const bad = paths.filter(isForbiddenPath);
if (bad.length) {
  console.error('\nBLOCKED: forbidden paths (local secrets / env files):\n');
  for (const p of bad) console.error(`   - ${p}`);
  console.error(
    '\nNever commit or push .env, .env.local, or .env.*.local. If staged by mistake: git reset HEAD -- <file>\n'
  );
  process.exit(1);
}

process.exit(0);
