import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  console.log('Enabling Supabase Realtime for listings and bids tables...')

  await prisma.$executeRawUnsafe(
    `ALTER PUBLICATION supabase_realtime ADD TABLE public."Listing", public."Bid"`
  )

  console.log('✅ Realtime enabled for Listing and Bid tables')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
