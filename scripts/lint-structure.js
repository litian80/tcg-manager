/**
 * Structure Lint — Catches file placement violations in CI or locally.
 * Run: node scripts/lint-structure.js
 * 
 * Checks:
 * 1. No "use server" files outside actions/
 * 2. No SQL files in root
 * 3. No Python files outside tools/
 * 4. No leaked secrets patterns
 * 5. Root directory is clean
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];

// --- Rule 1: Server actions must be in actions/ ---
function checkServerActions() {
  const scanDirs = ['app', 'components', 'lib', 'utils', 'hooks'];
  
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    walkFiles(fullDir, (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n')[0].trim();
      
      // Allow "use server" in route-level files that re-export (e.g., page.tsx calling actions)
      // but flag standalone action files
      if (firstLine === '"use server";' || firstLine === "'use server';") {
        const rel = path.relative(ROOT, filePath);
        errors.push(`[SERVER_ACTION] "${rel}" contains "use server" but is outside actions/. Move to actions/<domain>/.`);
      }
    });
  }
}

// --- Rule 2: No SQL, Python, or report files in root ---
function checkRootCleanliness() {
  const rootFiles = fs.readdirSync(ROOT);
  const banned = ['.sql', '.py', '.pyc', '.ipynb', '.html', '.csv'];
  const bannedPatterns = ['schema.json', 'prod_simplified_schema.txt', 'credentials.json', 'token.json'];
  
  for (const file of rootFiles) {
    const filePath = path.join(ROOT, file);
    if (!fs.statSync(filePath).isFile()) continue;
    
    const ext = path.extname(file).toLowerCase();
    if (banned.includes(ext)) {
      errors.push(`[ROOT_POLLUTION] "${file}" (${ext}) should not be in project root. See /file-placement workflow.`);
    }
    if (bannedPatterns.includes(file)) {
      errors.push(`[ROOT_POLLUTION] "${file}" should not be in project root.`);
    }
  }
}

// --- Rule 3: No Python files outside tools/ and scripts/ ---
function checkPythonPlacement() {
  const scanDirs = ['app', 'components', 'lib', 'utils', 'hooks', 'actions', 'db'];
  
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    walkFiles(fullDir, (filePath) => {
      if (filePath.endsWith('.py') || filePath.endsWith('.pyc')) {
        const rel = path.relative(ROOT, filePath);
        errors.push(`[PYTHON_MISPLACED] "${rel}" — Python files belong in tools/ or scripts/.`);
      }
    });
  }
}

// --- Rule 4: Secret patterns ---
function checkSecretPatterns() {
  const scanDirs = ['actions', 'app', 'components', 'lib', 'utils', '.agent'];
  const secretPatterns = [
    /sk-[a-zA-Z0-9]{32,}/,                    // API keys
    /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,  // Private keys
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']ey/, // Supabase service key inline
  ];
  
  for (const dir of scanDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    walkFiles(fullDir, (filePath) => {
      if (filePath.endsWith('.json') || filePath.includes('node_modules')) return;
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            const rel = path.relative(ROOT, filePath);
            errors.push(`[SECRET_LEAK] "${rel}" may contain a hardcoded secret. Use environment variables.`);
            break;
          }
        }
      } catch {
        // Skip binary files
      }
    });
  }
}

// --- Rule 5: __pycache__ directories ---
function checkPycache() {
  walkDirs(ROOT, (dirPath) => {
    if (path.basename(dirPath) === '__pycache__') {
      const rel = path.relative(ROOT, dirPath);
      errors.push(`[PYCACHE] "${rel}" — Delete this directory. Add __pycache__/ to .gitignore.`);
    }
  });
}

// --- Utilities ---
function walkFiles(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function walkDirs(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      callback(fullPath);
      walkDirs(fullPath, callback);
    }
  }
}

// --- Run ---
console.log('🔍 Running structure lint...\n');

checkServerActions();
checkRootCleanliness();
checkPythonPlacement();
checkSecretPatterns();
checkPycache();

if (errors.length === 0) {
  console.log('✅ All structure checks passed.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${errors.length} violation(s):\n`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log('\nSee .agent/workflows/file-placement.md for correct locations.');
  process.exit(1);
}
