import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { getCurrentUser } from '@/lib/auth/session'
import { readAvatarImage } from '@/lib/media/storage'

type AvatarRouteProps = { params: Promise<{ id: string }> }

export const GET = async (_request: Request, { params }: AvatarRouteProps) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return new NextResponse(null, { status: 401 })
  const { id } = await params
  const member = await db.query.users.findFirst({ where: eq(users.id, id), columns: { familyId: true, avatarStorageKey: true } })
  if (!member || member.familyId !== currentUser.familyId || !member.avatarStorageKey) return new NextResponse(null, { status: 404 })
  try {
    const body = await readAvatarImage(member.avatarStorageKey)
    return new NextResponse(new Uint8Array(body), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
