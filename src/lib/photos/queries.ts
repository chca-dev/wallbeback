import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import type { UserRole } from '@/db/schema/enums'
import { photoPeople, photos } from '@/db/schema/photos'
import { users } from '@/db/schema/users'
import { posts } from '@/db/schema/wall'
import type { AvatarTone } from '@/lib/demo-data'

export type PhotoGalleryMember = {
  id: string
  name: string
  shortName: string
  tone: AvatarTone
  photoCount: number
}

export type PhotoGalleryItem = {
  id: string
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

export type PhotoGalleryData = {
  members: PhotoGalleryMember[]
  photos: PhotoGalleryItem[]
}

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
})

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'

const getShortName = (displayName: string) => displayName.trim().split(/\s+/)[0] || displayName

const formatMonth = (date: Date) => {
  const label = monthFormatter.format(date)

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

export const getPhotoGalleryData = async (
  familyId: string,
  currentUserRole: UserRole,
): Promise<PhotoGalleryData> => {
  const photoVisibilityCondition = currentUserRole === 'child'
    ? and(
        eq(photos.familyId, familyId),
        eq(posts.visibility, 'family'),
      )
    : eq(photos.familyId, familyId)
  const [photoRows, memberRows, tagRows] = await Promise.all([
    db
      .select({
        id: photos.id,
        postId: posts.id,
        caption: photos.caption,
        takenAt: photos.takenAt,
        createdAt: photos.createdAt,
        width: photos.width,
        height: photos.height,
        ownerName: users.displayName,
      })
      .from(photos)
      .innerJoin(
        users,
        and(
          eq(users.id, photos.ownerId),
          eq(users.familyId, photos.familyId),
        ),
      )
      .innerJoin(
        posts,
        and(
          eq(posts.id, photos.postId),
          eq(posts.familyId, photos.familyId),
        ),
      )
      .where(photoVisibilityCondition)
      .orderBy(
        desc(sql`coalesce(${photos.takenAt}, ${photos.createdAt})`),
        desc(photos.createdAt),
      ),
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarTone: users.avatarTone,
      })
      .from(users)
      .where(and(eq(users.familyId, familyId), eq(users.isActive, true)))
      .orderBy(users.createdAt),
    db
      .select({
        photoId: photoPeople.photoId,
        userId: photoPeople.userId,
      })
      .from(photoPeople)
      .innerJoin(
        users,
        and(
          eq(users.id, photoPeople.userId),
          eq(users.familyId, photoPeople.familyId),
          eq(users.isActive, true),
        ),
      )
      .where(eq(photoPeople.familyId, familyId)),
  ])
  const peopleByPhoto = new Map<string, string[]>()
  const photoCountByMember = new Map<string, number>()
  const visiblePhotoIds = new Set(photoRows.map(({ id }) => id))

  tagRows.forEach(({ photoId, userId }) => {
    if (!visiblePhotoIds.has(photoId)) return

    peopleByPhoto.set(photoId, [...(peopleByPhoto.get(photoId) ?? []), userId])
    photoCountByMember.set(userId, (photoCountByMember.get(userId) ?? 0) + 1)
  })

  return {
    members: memberRows.map((member) => ({
      id: member.id,
      name: member.displayName,
      shortName: getShortName(member.displayName),
      tone: getAvatarTone(member.avatarTone),
      photoCount: photoCountByMember.get(member.id) ?? 0,
    })),
    photos: photoRows.map((photo) => ({
      id: photo.id,
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
  }
}
