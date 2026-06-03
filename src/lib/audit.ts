import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('AuditLog').insert({
    adminId,
    action,
    targetId: targetId ?? null,
    targetType: targetType ?? null,
    details: details ?? null,
  }).then(({ error }) => {
    if (error) console.error('[audit]', error.message)
  })
}
