import { randomUUID } from 'node:crypto'

import { count, eq, sql, sum } from 'drizzle-orm'

import { db } from '@/db/client'
import { photos } from '@/db/schema/photos'
import type { CurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import type { ProcessedImage } from '@/lib/media/process-image'
import { removeProcessedImage, writeProcessedImage } from '@/lib/media/storage'

export type PhotoStorageError = Error & {
  code: 'post-photo-limit' | 'storage-quota-exceeded'
}

const createPhotoStorageError = (
  code: PhotoStorageError['code'],
  message: string,
): PhotoStorageError => Object.assign(
  new Error(message),
  {
    name: 'PhotoStorageError',
    code,
  },
)

export const isPhotoStorageError = (error: unknown): error is PhotoStorageError => (
  error instanceof Error && error.name === 'PhotoStorageError' && 'code' in error
)

const getSafeOriginalName = (name: string) => name
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .slice(0, 255) || 'photo'

export const createStoredPhoto = async (
  currentUser: CurrentUser,
  postId: string,
  originalName: string,
  image: ProcessedImage,
) => {
  const photoId = randomUUID()
  const storageKey = photoId

  await writeProcessedImage(storageKey, image)

  try {
    await db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('wall_be_back_media_quota'))`,
      )

      const [usage] = await transaction
        .select({ byteSize: sum(photos.byteSize) })
        .from(photos)
      const currentStorageBytes = Number(usage?.byteSize ?? 0)

      if (currentStorageBytes + image.totalSize > serverEnvironment.MAX_STORAGE_BYTES) {
        throw createPhotoStorageError(
          'storage-quota-exceeded',
          'L’espace réservé aux photos est plein.',
        )
      }

      const [postPhotoCount] = await transaction
        .select({ value: count() })
        .from(photos)
        .where(eq(photos.postId, postId))

      if ((postPhotoCount?.value ?? 0) >= 6) {
        throw createPhotoStorageError(
          'post-photo-limit',
          'Cette publication contient déjà six photos.',
        )
      }

      await transaction.insert(photos).values({
        id: photoId,
        familyId: currentUser.familyId,
        ownerId: currentUser.id,
        postId,
        storageKey,
        originalName: getSafeOriginalName(originalName),
        mimeType: 'image/webp',
        byteSize: image.totalSize,
        width: image.width,
        height: image.height,
      })
    })
  } catch (error) {
    try {
      await removeProcessedImage(storageKey)
    } catch {
      // Conserver l’erreur de base ou de quota si le nettoyage échoue aussi.
    }

    throw error
  }

  return {
    id: photoId,
    width: image.width,
    height: image.height,
    byteSize: image.totalSize,
    urls: {
      display: `/media/${photoId}/display`,
      thumb: `/media/${photoId}/thumb`,
    },
  }
}
