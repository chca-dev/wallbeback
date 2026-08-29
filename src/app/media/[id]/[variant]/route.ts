import { and, eq, isNull, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { photos } from '@/db/schema/photos'
import { posts } from '@/db/schema/wall'
import { getCurrentUser } from '@/lib/auth/session'
import {
  mediaVariantValues,
  readProcessedImage,
} from '@/lib/media/storage'

const mediaRequestSchema = z.object({
  id: z.string().uuid(),
  variant: z.enum(mediaVariantValues),
})

export const runtime = 'nodejs'

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) => {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  }

  if (currentUser.mustChangePassword) {
    return NextResponse.json({ message: 'Accès refusé.' }, { status: 403 })
  }

  const parsedParams = mediaRequestSchema.safeParse(await params)

  if (!parsedParams.success) {
    return NextResponse.json({ message: 'Photo introuvable.' }, { status: 404 })
  }

  const photoAccessCondition = currentUser.role === 'child'
    ? and(
        eq(photos.id, parsedParams.data.id),
        eq(photos.familyId, currentUser.familyId),
        or(
          isNull(photos.postId),
          eq(posts.visibility, 'family'),
        ),
      )
    : and(
        eq(photos.id, parsedParams.data.id),
        eq(photos.familyId, currentUser.familyId),
      )

  const [photo] = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .leftJoin(
      posts,
      and(
        eq(posts.id, photos.postId),
        eq(posts.familyId, photos.familyId),
      ),
    )
    .where(photoAccessCondition)
    .limit(1)

  if (!photo) {
    return NextResponse.json({ message: 'Photo introuvable.' }, { status: 404 })
  }

  try {
    const image = await readProcessedImage(photo.storageKey, parsedParams.data.variant)

    return new Response(new Uint8Array(image), {
      headers: {
        'Cache-Control': 'private, max-age=86400',
        'Content-Length': image.length.toString(),
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Photo introuvable.' }, { status: 404 })
  }
}
