import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const ADMIN_EMAIL    = 'syedshazni@gmail.com'
const ADMIN_PASSWORD = 'Rehome@Admin2026!'
const ADMIN_NAME     = 'Syed Shazni'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma  = new PrismaClient({ adapter })

  // 1. Create or fetch Supabase Auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email === ADMIN_EMAIL)

  let authUserId: string

  if (existingUser) {
    authUserId = existingUser.id
    // Update password
    await supabase.auth.admin.updateUserById(authUserId, { password: ADMIN_PASSWORD })
    console.log('Auth user already exists — password updated.')
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME },
    })
    if (error) throw new Error(`Supabase auth error: ${error.message}`)
    authUserId = data.user.id
    console.log('Auth user created.')
  }

  // 2. Upsert Prisma User record with ADMIN role
  const dbUser = await prisma.user.upsert({
    where: { id: authUserId },
    create: {
      id:    authUserId,
      email: ADMIN_EMAIL,
      name:  ADMIN_NAME,
      role:  'ADMIN',
      rehomeScore: 100,
      icVerified:  true,
      icStatus:    'VERIFIED',
    },
    update: {
      role:        'ADMIN',
      rehomeScore: 100,
      icVerified:  true,
      icStatus:    'VERIFIED',
    },
  })

  console.log('\n✅ Admin account ready:')
  console.log(`   Email    : ${ADMIN_EMAIL}`)
  console.log(`   Password : ${ADMIN_PASSWORD}`)
  console.log(`   Role     : ${dbUser.role}`)
  console.log(`   User ID  : ${dbUser.id}`)
  console.log('\n   Login → https://rehome-eta.vercel.app/auth/login')
  console.log('   Panel  → https://rehome-eta.vercel.app/admin')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
