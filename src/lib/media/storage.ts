import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

import { z } from 'zod'

import { serverEnvironment } from '@/lib/env'
import type { ProcessedImage } from '@/lib/media/process-image'
import type { ProcessedAvatar } from '@/lib/media/process-image'

export const mediaVariantValues = ['display', 'thumb'] as const

export type MediaVariant = typeof mediaVariantValues[number]

const storageKeySchema = z.string().uuid()
const mediaRoot = resolve(serverEnvironment.UPLOAD_DIR)
const avatarRoot = resolve(mediaRoot, 'avatars')

const getSafePathInsideMediaRoot = (...segments: string[]) => {
  const targetPath = resolve(mediaRoot, ...segments)
  const relativePath = relative(mediaRoot, targetPath)

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Chemin média invalide')
  }

  return targetPath
}

const getMediaDirectory = (storageKey: string) => {
  const parsedStorageKey = storageKeySchema.safeParse(storageKey)

  if (!parsedStorageKey.success) {
    throw new Error('Clé de stockage invalide')
  }

  return getSafePathInsideMediaRoot(parsedStorageKey.data)
}

export const writeProcessedImage = async (
  storageKey: string,
  image: ProcessedImage,
) => {
  const finalDirectory = getMediaDirectory(storageKey)
  const temporaryDirectory = getSafePathInsideMediaRoot(
    `.upload-${storageKey}-${randomUUID()}`,
  )

  await mkdir(mediaRoot, { recursive: true })

  try {
    await mkdir(temporaryDirectory)
    await writeFile(
      join(temporaryDirectory, 'display.webp'),
      image.display,
      { flag: 'wx' },
    )
    await writeFile(
      join(temporaryDirectory, 'thumb.webp'),
      image.thumb,
      { flag: 'wx' },
    )
    await rename(temporaryDirectory, finalDirectory)
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

export const removeProcessedImage = async (storageKey: string) => {
  await rm(getMediaDirectory(storageKey), { recursive: true, force: true })
}

export const readProcessedImage = async (
  storageKey: string,
  variant: MediaVariant,
) => readFile(join(getMediaDirectory(storageKey), `${variant}.webp`))

const getAvatarDirectory = (storageKey: string) => {
  const parsedStorageKey = storageKeySchema.safeParse(storageKey)
  if (!parsedStorageKey.success) throw new Error('Clé d’avatar invalide')
  return getSafePathInsideMediaRoot('avatars', parsedStorageKey.data)
}

export const writeAvatarImage = async (storageKey: string, avatar: ProcessedAvatar) => {
  const finalDirectory = getAvatarDirectory(storageKey)
  const temporaryDirectory = getSafePathInsideMediaRoot('avatars', `.upload-${storageKey}-${randomUUID()}`)
  await mkdir(avatarRoot, { recursive: true })
  try {
    await mkdir(temporaryDirectory)
    await writeFile(join(temporaryDirectory, 'avatar.webp'), avatar.data, { flag: 'wx' })
    await rename(temporaryDirectory, finalDirectory)
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

export const readAvatarImage = async (storageKey: string) => {
  try {
    return await readFile(join(getAvatarDirectory(storageKey), 'avatar.webp'))
  } catch {
    return readProcessedImage(storageKey, 'thumb')
  }
}

export const removeAvatarImage = async (storageKey: string) => {
  await Promise.all([
    rm(getAvatarDirectory(storageKey), { recursive: true, force: true }),
    removeProcessedImage(storageKey),
  ])
}
