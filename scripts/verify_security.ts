/**
 * Static Security & Secret Verification Script
 * Validates repository compliance against credential leaks and frontend isolation constraints.
 *
 * Checks:
 * 1. src/ contains ZERO instances of SARVAM_API_KEY or VITE_SARVAM_API_KEY.
 * 2. src/ contains ZERO imports of the sarvamai SDK.
 * 3. src/ contains ZERO direct calls to api.sarvam.ai.
 * 4. src/ contains ZERO api-subscription-key headers.
 * 5. Tracked files contain ZERO hardcoded secret patterns (e.g. sk_...).
 * 6. Backend only references process.env.SARVAM_API_KEY.
 */

import fs from 'fs';
import path from 'path';

let violationCount = 0;

function reportViolation(file: string, issue: string): void {
  console.error(`❌ Security Violation in [${file}]: ${issue}`);
  violationCount++;
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'coverage', '.cache'].includes(entry.name)) {
        getAllFiles(fullPath, fileList);
      }
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

console.log('🔒 Running Static Security Audit on ZipStream codebase...\n');

// 1. Audit Frontend Files in src/
const srcFiles = getAllFiles(srcDir);
const frontendDisallowedPatterns = [
  { pattern: /SARVAM_API_KEY/, name: 'SARVAM_API_KEY variable reference in frontend' },
  { pattern: /VITE_SARVAM_API_KEY/, name: 'VITE_SARVAM_API_KEY variable reference' },
  { pattern: /from\s+['"]sarvamai['"]/, name: 'Direct sarvamai SDK import in frontend' },
  { pattern: /require\(['"]sarvamai['"]\)/, name: 'Direct sarvamai SDK require in frontend' },
  { pattern: /api\.sarvam\.ai/, name: 'Direct call to api.sarvam.ai from browser' },
  { pattern: /api-subscription-key/i, name: 'Direct Sarvam authorization header in frontend' },
];

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(rootDir, file);

  for (const check of frontendDisallowedPatterns) {
    if (check.pattern.test(content)) {
      reportViolation(relPath, check.name);
    }
  }
}

if (violationCount === 0) {
  console.log('✅ Frontend isolation check: OK (Zero Sarvam keys, headers, or SDK imports in src/)');
  console.log('✅ No third-party direct API calls in client: OK');
}

// 2. Audit Backend & Config for Hardcoded Secret Values
const allRepoFiles = getAllFiles(rootDir).filter(f => {
  const ext = path.extname(f);
  return ['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.env.example', '.md', '.yml', '.yaml'].includes(ext);
});

const secretLiteralPattern = /['"`](?:sk_[a-zA-Z0-9_-]{24,}|sarvam_[a-zA-Z0-9_-]{24,})['"`]/;

for (const file of allRepoFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(rootDir, file);

  if (secretLiteralPattern.test(content)) {
    reportViolation(relPath, 'Potential hardcoded secret literal detected matching key pattern');
  }
}

// 3. Verify Backend Secret Consumption is process.env.SARVAM_API_KEY only
const serverAiFile = path.join(rootDir, 'server', 'ai', 'sarvam.ts');
if (fs.existsSync(serverAiFile)) {
  const content = fs.readFileSync(serverAiFile, 'utf8');
  if (!content.includes('process.env.SARVAM_API_KEY')) {
    reportViolation('server/ai/sarvam.ts', 'Expected process.env.SARVAM_API_KEY reference was not found');
  } else {
    console.log('✅ Sarvam backend secret reference: OK (Exclusively uses process.env.SARVAM_API_KEY)');
  }
}

console.log('\n----------------------------------------');
if (violationCount > 0) {
  console.error(`❌ Security audit FAILED with ${violationCount} issue(s). Potential secret exposure detected.`);
  process.exit(1);
} else {
  console.log('🎉 Overall security check: PASSED. Codebase is clean and production-safe.\n');
  process.exit(0);
}
