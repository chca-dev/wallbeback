import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { getCurrentUser } from '@/lib/auth/session'
import { readAvatarImage } from '@/lib/media/storage'

type AvatarRouteProps = { params: Promise<{ id: string }> }
const memberIdSchema = z.uuid()

export const GET = async (_request: Request, { params }: AvatarRouteProps) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return new NextResponse(null, { status: 401 })
  if (currentUser.mustChangePassword) return new NextResponse(null, { status: 403 })
  const parsedId = memberIdSchema.safeParse((await params).id)
  if (!parsedId.success) return new NextResponse(null, { status: 404 })
  const id = parsedId.data
  const member = await db.query.users.findFirst({ where: eq(users.id, id), columns: { familyId: true, avatarStorageKey: true } })
  if (!member || member.familyId !== currentUser.familyId || !member.avatarStorageKey) return new NextResponse(null, { status: 404 })
  try {
    const body = await readAvatarImage(member.avatarStorageKey)
    return new NextResponse(new Uint8Array(body), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
