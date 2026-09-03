import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { pushSubscriptions } from '@/db/schema/push-subscriptions'
import { getCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const subscriptionSchema = z.object({
  endpoint: z.url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

const requirePushUser = async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.mustChangePassword) return null
  return currentUser
}

export const GET = async () => {
  const currentUser = await requirePushUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })

  return NextResponse.json({
    available: Boolean(serverEnvironment.WEB_PUSH_PUBLIC_KEY),
    publicKey: serverEnvironment.WEB_PUSH_PUBLIC_KEY ?? null,
  })
}

export const POST = async (request: Request) => {
  const currentUser = await requirePushUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  if (!serverEnvironment.WEB_PUSH_PUBLIC_KEY) {
    return NextResponse.json({ message: 'Les notifications ne sont pas configurées.' }, { status: 503 })
  }

  let body: unknown
  try { body = await request.json() } catch { body = null }
  const parsed = subscriptionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Souscription invalide.' }, { status: 400 })

  await db.insert(pushSubscriptions).values({
    familyId: currentUser.familyId,
    userId: currentUser.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: {
      familyId: currentUser.familyId,
      userId: currentUser.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}

export const DELETE = async (request: Request) => {
  const currentUser = await requirePushUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { body = null }
  const parsed = z.object({ endpoint: z.url().max(4096) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Souscription invalide.' }, { status: 400 })

  await db.delete(pushSubscriptions).where(and(
    eq(pushSubscriptions.endpoint, parsed.data.endpoint),
    eq(pushSubscriptions.userId, currentUser.id),
    eq(pushSubscriptions.familyId, currentUser.familyId),
  ))

  return NextResponse.json({ success: true })
}
