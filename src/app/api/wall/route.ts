import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { getWallPage } from '@/lib/wall/queries'

const wallRequestSchema = z.object({
  cursor: z.string().max(512).nullable(),
})

export const GET = async (request: Request) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  if (currentUser.mustChangePassword) return NextResponse.json({ message: 'Accès refusé.' }, { status: 403 })

  const url = new URL(request.url)
  const parsed = wallRequestSchema.safeParse({ cursor: url.searchParams.get('cursor') })
  if (!parsed.success) return NextResponse.json({ message: 'Curseur invalide.' }, { status: 400 })

  try {
    const page = await getWallPage({
      familyId: currentUser.familyId,
      currentUserId: currentUser.id,
      role: currentUser.role,
      cursor: parsed.data.cursor,
    })
    return NextResponse.json(page)
  } catch {
    return NextResponse.json({ message: 'Curseur invalide.' }, { status: 400 })
  }
}
