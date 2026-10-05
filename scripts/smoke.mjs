// Read-only smoke test. It only issues GET requests, so it is safe against production.
//
//   node scripts/smoke.mjs --base https://kassim.app
//   node scripts/smoke.mjs --deployment https://rehome-xxxx.vercel.app   (protected URL, via `vercel curl`)

import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] }
const base = flag('--base')
const deployment = flag('--deployment')
if (!base && !deployment) {
  console.error('usage: smoke.mjs --base <url> | --deployment <url>')
  process.exit(2)
}

const MARK = '\n__STATUS__'

/** @returns {Promise<{ status: number, body: string }>} */
async function get(path) {
  if (deployment) {
    // Body goes to a temp file and only the status code to stdout: cmd.exe mangles
    // multi-line arguments, so nothing fancy is passed through the shell.
    const file = join(tmpdir(), `kassim-smoke-${process.pid}.bin`)
    const cmd = `vercel curl "${path}" --deployment ${deployment} -- -sS -o "${file}" -w "%{http_code}"`
    const r = spawnSync(cmd, { encoding: 'utf8', shell: true })
    const status = Number((r.stdout ?? '').trim().split(/\s+/).pop())
    let body = ''
    try { body = readFileSync(file, 'latin1'); rmSync(file) } catch { /* no body written */ }
    if (!status) return { status: 0, body: (r.stderr ?? '').slice(-300) }
    return { status, body }
  }
  const res = await fetch(base + path, { redirect: 'manual' })
  return { status: res.status, body: await res.text() }
}

const REDIRECT = [302, 303, 307, 308]
const checks = [
  { path: '/', status: [200], has: ['KASSIM', 'Win in 30 minutes'] },
  { path: '/story', status: [200], has: ['Meet Kassim'] },
  { path: '/listings', status: [200], has: ['FLASH BID', 'SWAP BID'] },
  { path: '/listings?mode=swap', status: [200], has: ['SWAP BID'] },
  { path: '/how-it-works', status: [200], has: ['How KASSIM Works'] },
  { path: '/impact', status: [200], has: ['Impact'] },
  { path: '/jual', status: [200], has: ['KASSIM'] },
  { path: '/terms', status: [200], has: ['Terms of Service'] },
  { path: '/privacy', status: [200], has: ['Privacy Policy'] },
  { path: '/auth/login', status: [200], has: ['Sign In'] },
  { path: '/auth/register', status: [200], has: ['Join KASSIM'] },
  { path: '/this-page-does-not-exist', status: [404], has: ['Even Kassim'] },
  { path: '/kassim/3d-point.webp', status: [200] },
  { path: '/kassim/head-smile.webp', status: [200] },
  { path: '/manifest.webmanifest', status: [200], has: ['KASSIM'] },
  { path: '/api/time', status: [200], has: ['serverTime'] },
  // signed-out visitors must be sent to login, never shown a private page
  { path: '/dashboard', status: REDIRECT },
  { path: '/sell', status: REDIRECT },
  { path: '/admin', status: [...REDIRECT, 404] },
  // must never appear for a signed-out visitor on any public page
  { path: '/', lacks: ['You won', 'Application error'] },
]

let failed = 0
for (const c of checks) {
  const { status, body } = await get(c.path)
  const problems = []
  if (c.status && !c.status.includes(status)) problems.push(`status ${status}, expected ${c.status.join('/')}`)
  for (const text of c.has ?? []) if (!body.includes(text)) problems.push(`missing "${text}"`)
  if (c.lacks && status !== 200) problems.push(`status ${status}, could not inspect the page`)
  for (const text of c.lacks ?? []) if (body.includes(text)) problems.push(`must not contain "${text}"`)
  if (problems.length) failed++
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${c.path}${problems.length ? '  ->  ' + problems.join('; ') : ''}`)
}

console.log(failed ? `\n${failed} of ${checks.length} checks failed` : `\nall ${checks.length} checks passed`)
process.exit(failed ? 1 : 0)
