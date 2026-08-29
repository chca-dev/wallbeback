import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { getCurrentUser } from '@/lib/auth/session'
import { readBannerImage } from '@/lib/media/storage'

type BannerRouteProps = { params: Promise<{ familyId: string }> }

export const GET = async (_request: Request, { params }: BannerRouteProps) => {
  const currentUser = await getCurrentUser()
  const { familyId } = await params
  if (!currentUser || currentUser.familyId !== familyId) return new NextResponse(null, { status: 404 })
  const familySettings = await db.query.settings.findFirst({ where: eq(settings.familyId, familyId), columns: { bannerStorageKey: true } })
  if (!familySettings?.bannerStorageKey) return new NextResponse(null, { status: 404 })
  try {
    const body = await readBannerImage(familySettings.bannerStorageKey)
    return new NextResponse(new Uint8Array(body), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
