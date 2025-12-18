#!/usr/bin/env node

/**
 * URL Configuration Verification Script
 * Run this to verify all URLs are correctly configured
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'https://enthusiastic-cat-production-f806.up.railway.app';
const BACKEND_URL = 'https://automationdash-production.up.railway.app';

console.log('🔍 Verifying Railway URL Configuration...\n');

const checks = [];

// Check 1: server/.env
try {
  const serverEnv = fs.readFileSync(path.join(__dirname, 'server', '.env'), 'utf8');
  const hasFrontendUrl = serverEnv.includes(`FRONTEND_URL=${FRONTEND_URL}`);
  checks.push({
    file: 'server/.env',
    check: 'FRONTEND_URL',
    status: hasFrontendUrl ? '✅' : '❌',
    expected: FRONTEND_URL,
    found: hasFrontendUrl
  });
} catch (err) {
  checks.push({
    file: 'server/.env',
    check: 'File exists',
    status: '❌',
    error: err.message
  });
}

// Check 2: client/.env.local
try {
  const clientEnvLocal = fs.readFileSync(path.join(__dirname, 'client', '.env.local'), 'utf8');
  const hasBackendUrl = clientEnvLocal.includes(`VITE_API_URL=${BACKEND_URL}`);
  checks.push({
    file: 'client/.env.local',
    check: 'VITE_API_URL',
    status: hasBackendUrl ? '✅' : '❌',
    expected: BACKEND_URL,
    found: hasBackendUrl
  });
} catch (err) {
  checks.push({
    file: 'client/.env.local',
    check: 'File exists',
    status: '❌',
    error: err.message
  });
}

// Check 3: client/.env.production
try {
  const clientEnvProd = fs.readFileSync(path.join(__dirname, 'client', '.env.production'), 'utf8');
  const hasBackendUrl = clientEnvProd.includes(`VITE_API_URL=${BACKEND_URL}`);
  checks.push({
    file: 'client/.env.production',
    check: 'VITE_API_URL',
    status: hasBackendUrl ? '✅' : '❌',
    expected: BACKEND_URL,
    found: hasBackendUrl
  });
} catch (err) {
  checks.push({
    file: 'client/.env.production',
    check: 'File exists',
    status: '❌',
    error: err.message
  });
}

// Check 4: client/src/lib/api.ts
try {
  const apiTs = fs.readFileSync(path.join(__dirname, 'client', 'src', 'lib', 'api.ts'), 'utf8');
  const hasBackendUrl = apiTs.includes(`'${BACKEND_URL}'`);
  checks.push({
    file: 'client/src/lib/api.ts',
    check: 'baseURL fallback',
    status: hasBackendUrl ? '✅' : '❌',
    expected: BACKEND_URL,
    found: hasBackendUrl
  });
} catch (err) {
  checks.push({
    file: 'client/src/lib/api.ts',
    check: 'File exists',
    status: '❌',
    error: err.message
  });
}

// Check 5: server/src/index.js CORS
try {
  const indexJs = fs.readFileSync(path.join(__dirname, 'server', 'src', 'index.js'), 'utf8');
  const hasFrontendUrl = indexJs.includes(FRONTEND_URL);
  checks.push({
    file: 'server/src/index.js',
    check: 'CORS configuration',
    status: hasFrontendUrl ? '✅' : '❌',
    expected: FRONTEND_URL,
    found: hasFrontendUrl
  });
} catch (err) {
  checks.push({
    file: 'server/src/index.js',
    check: 'File exists',
    status: '❌',
    error: err.message
  });
}

// Print results
console.log('📋 Configuration Check Results:\n');
console.log('─'.repeat(80));

checks.forEach(check => {
  console.log(`${check.status} ${check.file}`);
  console.log(`   Check: ${check.check}`);
  if (check.expected) {
    console.log(`   Expected: ${check.expected}`);
    console.log(`   Found: ${check.found ? 'Yes' : 'No'}`);
  }
  if (check.error) {
    console.log(`   Error: ${check.error}`);
  }
  console.log('');
});

console.log('─'.repeat(80));

const allPassed = checks.every(c => c.status === '✅');

if (allPassed) {
  console.log('\n✅ All checks passed! Your configuration is ready for Railway deployment.\n');
  console.log('Next steps:');
  console.log('1. Commit and push your changes');
  console.log('2. Set environment variables in Railway dashboard');
  console.log('3. Deploy both services');
  console.log('4. Test the deployment\n');
} else {
  console.log('\n❌ Some checks failed. Please review the configuration.\n');
  console.log('Expected URLs:');
  console.log(`  Frontend: ${FRONTEND_URL}`);
  console.log(`  Backend:  ${BACKEND_URL}\n`);
  process.exit(1);
}

// Additional info
console.log('📚 Documentation:');
console.log('  - DEPLOYMENT_URLS.md - Detailed deployment information');
console.log('  - RAILWAY_SETUP_CHECKLIST.md - Step-by-step deployment guide\n');
