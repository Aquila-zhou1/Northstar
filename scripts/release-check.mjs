import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const failures = [];
const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap(name => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
}

function findMatches(files, patterns) {
  return files.flatMap(path => {
    const text = readText(path);
    return patterns.some(pattern => pattern.test(text)) ? [path] : [];
  });
}

const trackedEnvironmentFiles = trackedFiles.filter(path => /(^|\/)\.env(?:\..+)?$/.test(path));
const unexpectedEnvironmentFiles = trackedEnvironmentFiles.filter(path => path !== '.env.example');
if (unexpectedEnvironmentFiles.length) {
  failures.push(`Tracked private environment files: ${unexpectedEnvironmentFiles.join(', ')}`);
} else {
  console.log('PASS: only .env.example is tracked');
}

const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/,
  /VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|DATABASE_URL|PASSWORD|PRIVATE_KEY)\s*=/,
  new RegExp(['c2Vydmlj', 'ZV9yb2xl'].join(''))
];
const trackedSecretMatches = findMatches(trackedFiles, secretPatterns);
if (trackedSecretMatches.length) {
  failures.push(`Possible server secret in tracked files: ${trackedSecretMatches.join(', ')}`);
} else {
  console.log('PASS: tracked files contain no server-secret pattern');
}

const sourceFiles = walk('src').filter(path => ['.js', '.vue', '.ts'].includes(extname(path)));
const legacyStorageMatches = findMatches(sourceFiles, [
  /northstar-planner-v1/,
  /(?:window\.)?localStorage\.(?:getItem|setItem|removeItem)\s*\(/
]);
if (legacyStorageMatches.length) {
  failures.push(`Legacy planner storage access remains: ${legacyStorageMatches.join(', ')}`);
} else {
  console.log('PASS: planner source has no legacy localStorage data path');
}

const exampleVariableNames = readText('.env.example')
  .split(/\r?\n/)
  .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map(line => line.split('=', 1)[0])
  .sort();
const expectedVariableNames = ['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL'];
if (JSON.stringify(exampleVariableNames) !== JSON.stringify(expectedVariableNames)) {
  failures.push('.env.example must expose exactly the Supabase URL and publishable key');
} else {
  console.log('PASS: public environment contract contains exactly two variables');
}

const distFiles = walk('dist').filter(path => ['.css', '.html', '.js', '.map'].includes(extname(path)));
if (!distFiles.length) {
  failures.push('dist is missing; run the production build first');
} else {
  const distSecretMatches = findMatches(distFiles, secretPatterns);
  if (distSecretMatches.length) {
    failures.push(`Possible server secret in browser build: ${distSecretMatches.join(', ')}`);
  } else {
    console.log('PASS: browser build contains no server-secret pattern');
  }
}

if (failures.length) {
  console.error('\nRELEASE CHECK FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS: Northstar release safety contract is intact');
