// Staged production release. Nothing reaches kassim.app until every gate passes.
//
//   npm run ship
//
//   1. typecheck, lint (errors only), unit tests
//   2. build a production deployment WITHOUT pointing the domain at it
//   3. smoke-test that deployment
//   4. promote it to kassim.app
//   5. smoke-test kassim.app
//
// If step 3 fails the live site is untouched; the staged deployment is simply left unpromoted.

import { execSync, spawnSync } from 'node:child_process'

const SCOPE = 'syedshazni-7682s-projects'
const LIVE = 'https://kassim.app'

function step(title, cmd) {
  console.log(`\n== ${title}\n$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
if (dirty && !process.argv.includes('--allow-dirty')) {
  console.error('Working tree has uncommitted changes. Commit first, or pass --allow-dirty to ship them anyway:\n' + dirty)
  process.exit(1)
}

step('Typecheck', 'npx tsc --noEmit')
step('Lint', 'npx eslint . --quiet')
step('Unit tests', 'npx vitest run')

console.log('\n== Build staged production deployment (domain not switched)')
const deploy = spawnSync('vercel', ['deploy', '--prod', '--skip-domain', '--yes', '--scope', SCOPE], { encoding: 'utf8', shell: true })
process.stderr.write(deploy.stderr ?? '')
const url = (deploy.stdout ?? '').match(/https:\/\/[a-z0-9-]+\.vercel\.app/)?.[0]
if (deploy.status !== 0 || !url) {
  console.error('Staged build failed. The live site is unchanged.')
  process.exit(1)
}
console.log('staged at ' + url)

step('Smoke test staged deployment', `node scripts/smoke.mjs --deployment ${url}`)
step('Promote to production', `vercel promote ${url} --yes --scope ${SCOPE}`)
step('Smoke test live site', `node scripts/smoke.mjs --base ${LIVE}`)
console.log(`\nShipped: ${LIVE} now serves ${url}`)
