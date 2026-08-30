import 'server-only'

import { and, count, desc, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import type { UserRole } from '@/db/schema/enums'
import { photoPeople, photos } from '@/db/schema/photos'
import { users } from '@/db/schema/users'
import { posts } from '@/db/schema/wall'
import type { AvatarTone } from '@/lib/avatar'

type CursorPage<Item> = {
  items: Item[]
  nextCursor: string | null
}

export type PhotoGalleryMember = {
  id: string
  name: string
  shortName: string
  tone: AvatarTone
  photoCount: number
}

export type PhotoGalleryItem = {
  id: string
  ownerId: string
  displayUrl: string
  thumbUrl: string
  postUrl: string
  alt: string
  caption: string
  month: string
  people: string[]
  width: number
  height: number
}

export type PhotoGalleryPage = CursorPage<PhotoGalleryItem> & {
  members: PhotoGalleryMember[]
  totalCount: number
}

const photoCursorSchema = z.object({
  sortDate: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
})
const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})
const photoSortDate = sql<Date>`coalesce(${photos.takenAt}, ${photos.createdAt})`

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'
const getShortName = (displayName: string) => displayName.trim().split(/\s+/)[0] || displayName
const formatMonth = (date: Date) => {
  const label = monthFormatter.format(date)
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}
const encodePhotoCursor = (sortDate: Date, createdAt: Date, id: string) => Buffer
  .from(JSON.stringify({
    sortDate: sortDate.toISOString(),
    createdAt: createdAt.toISOString(),
    id,
  }))
  .toString('base64url')
const decodePhotoCursor = (cursor: string | null) => {
  if (!cursor) return null

  try {
    const parsed = photoCursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    if (!parsed.success) throw new Error('Curseur invalide')
    return {
      sortDate: new Date(parsed.data.sortDate),
      createdAt: new Date(parsed.data.createdAt),
      id: parsed.data.id,
    }
  } catch {
    throw new Error('Curseur invalide')
  }
}

export const getPhotoGalleryPage = async ({
  familyId,
  role,
  cursor = null,
  memberId = null,
  limit = 48,
}: {
  familyId: string
  role: UserRole
  cursor?: string | null
  memberId?: string | null
  limit?: number
}): Promise<PhotoGalleryPage> => {
  const decodedCursor = decodePhotoCursor(cursor)
  const visibilityCondition = role === 'child'
    ? and(eq(photos.familyId, familyId), eq(posts.visibility, 'family'))
    : eq(photos.familyId, familyId)
  const memberCondition = memberId ? eq(photos.ownerId, memberId) : undefined
  const cursorCondition = decodedCursor
    ? or(
        lt(photoSortDate, decodedCursor.sortDate),
        and(eq(photoSortDate, decodedCursor.sortDate), lt(photos.createdAt, decodedCursor.createdAt)),
        and(
          eq(photoSortDate, decodedCursor.sortDate),
          eq(photos.createdAt, decodedCursor.createdAt),
          lt(photos.id, decodedCursor.id),
        ),
      )
    : undefined
  const [photoRows, memberRows, countRows] = await Promise.all([
    db
      .select({
        id: photos.id,
        ownerId: photos.ownerId,
        postId: posts.id,
        caption: photos.caption,
        takenAt: photos.takenAt,
        createdAt: photos.createdAt,
        sortDate: photoSortDate,
        width: photos.width,
        height: photos.height,
        ownerName: users.displayName,
      })
      .from(photos)
      .innerJoin(users, and(eq(users.id, photos.ownerId), eq(users.familyId, photos.familyId)))
      .innerJoin(posts, and(eq(posts.id, photos.postId), eq(posts.familyId, photos.familyId)))
      .where(and(visibilityCondition, memberCondition, cursorCondition))
      .orderBy(desc(photoSortDate), desc(photos.createdAt), desc(photos.id))
      .limit(limit + 1),
    db
      .select({ id: users.id, displayName: users.displayName, avatarTone: users.avatarTone })
      .from(users)
      .where(and(eq(users.familyId, familyId), eq(users.isActive, true)))
      .orderBy(users.createdAt),
    db
      .select({ ownerId: photos.ownerId, value: count() })
      .from(photos)
      .innerJoin(posts, and(eq(posts.id, photos.postId), eq(posts.familyId, photos.familyId)))
      .where(visibilityCondition)
      .groupBy(photos.ownerId),
  ])
  const visibleRows = photoRows.slice(0, limit)
  const visiblePhotoIds = visibleRows.map(({ id }) => id)
  const tagRows = visiblePhotoIds.length
    ? await db
        .select({ photoId: photoPeople.photoId, userId: photoPeople.userId })
        .from(photoPeople)
        .innerJoin(users, and(
          eq(users.id, photoPeople.userId),
          eq(users.familyId, photoPeople.familyId),
          eq(users.isActive, true),
        ))
        .where(and(
          eq(photoPeople.familyId, familyId),
          inArray(photoPeople.photoId, visiblePhotoIds),
        ))
    : []
  const peopleByPhoto = new Map<string, string[]>()
  const photoCountByMember = new Map(countRows.map((row) => [row.ownerId, row.value]))
  tagRows.forEach(({ photoId, userId }) => {
    peopleByPhoto.set(photoId, [...(peopleByPhoto.get(photoId) ?? []), userId])
  })
  const lastRow = visibleRows.at(-1)

  return {
    members: memberRows.map((member) => ({
      id: member.id,
      name: member.displayName,
      shortName: getShortName(member.displayName),
      tone: getAvatarTone(member.avatarTone),
      photoCount: photoCountByMember.get(member.id) ?? 0,
    })),
    totalCount: memberId
      ? photoCountByMember.get(memberId) ?? 0
      : countRows.reduce((total, row) => total + row.value, 0),
    items: visibleRows.map((photo) => ({
      id: photo.id,
      ownerId: photo.ownerId,
      displayUrl: `/media/${photo.id}/display`,
      thumbUrl: `/media/${photo.id}/thumb`,
      postUrl: `/wall?post=${photo.postId}#post-${photo.postId}`,
      alt: photo.caption?.trim() || 'Photo de famille',
      caption: photo.caption?.trim() || `Ajoutée par ${photo.ownerName}`,
      month: formatMonth(photo.takenAt ?? photo.createdAt),
      people: peopleByPhoto.get(photo.id) ?? [],
      width: photo.width,
      height: photo.height,
    })),
    nextCursor: photoRows.length > limit && lastRow
      ? encodePhotoCursor(lastRow.sortDate, lastRow.createdAt, lastRow.id)
      : null,
  }
}
