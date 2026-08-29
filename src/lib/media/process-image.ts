import sharp, { type Metadata, type Sharp } from 'sharp'

import { serverEnvironment } from '@/lib/env'

const maxDimension = 20_000
const maxUploadMegabytes = Math.round(
  serverEnvironment.MAX_UPLOAD_BYTES / (1024 * 1024) * 10,
) / 10
const fileTooLargeMessage = `Cette photo dépasse la limite de ${maxUploadMegabytes} Mo.`

const supportedFormats = new Set(['jpeg', 'png', 'webp'])

sharp.cache({ files: 0, items: 20, memory: 32 })
sharp.concurrency(1)

type MediaProcessingErrorCode =
  | 'empty'
  | 'file-too-large'
  | 'invalid-image'
  | 'unsupported-format'
  | 'invalid-dimensions'
  | 'animated-image'

export type MediaProcessingError = Error & {
  code: MediaProcessingErrorCode
}

export type ProcessedImage = {
  display: Buffer
  thumb: Buffer
  displaySize: number
  thumbSize: number
  totalSize: number
  width: number
  height: number
}

export type ProcessedAvatar = {
  data: Buffer
}

export type ProcessedBanner = {
  data: Buffer
}

export type CropSelection = { x: number, y: number, width: number, height: number }

const cropImage = async (input: Buffer, crop?: CropSelection) => {
  if (!crop) return input
  const metadata = await sharp(input).metadata()
  if (!metadata.width || !metadata.height) throw createMediaProcessingError('invalid-image', 'Le cadrage est invalide.')
  const left = Math.max(0, Math.round(metadata.width * crop.x / 100))
  const top = Math.max(0, Math.round(metadata.height * crop.y / 100))
  const width = Math.min(metadata.width - left, Math.max(1, Math.round(metadata.width * crop.width / 100)))
  const height = Math.min(metadata.height - top, Math.max(1, Math.round(metadata.height * crop.height / 100)))
  return sharp(input).extract({ left, top, width, height }).toBuffer()
}

const createMediaProcessingError = (
  code: MediaProcessingErrorCode,
  message: string,
): MediaProcessingError => Object.assign(new Error(message), {
  name: 'MediaProcessingError',
  code,
})

export const isMediaProcessingError = (error: unknown): error is MediaProcessingError => (
  error instanceof Error && error.name === 'MediaProcessingError' && 'code' in error
)

let processingTail = Promise.resolve()

const enqueueImageProcessing = <T>(task: () => Promise<T>): Promise<T> => {
  const result = processingTail.then(task, task)
  processingTail = result.then(() => undefined, () => undefined)

  return result
}

const processImageImmediately = async (input: Buffer): Promise<ProcessedImage> => {
  if (!input.length) {
    throw createMediaProcessingError('empty', 'Choisis une photo non vide.')
  }

  if (input.length > serverEnvironment.MAX_UPLOAD_BYTES) {
    throw createMediaProcessingError(
      'file-too-large',
      fileTooLargeMessage,
    )
  }

  let image: Sharp
  let metadata: Metadata

  try {
    image = sharp(input, {
      failOn: 'warning',
      limitInputPixels: serverEnvironment.MAX_IMAGE_PIXELS,
      sequentialRead: true,
    })
    metadata = await image.metadata()
  } catch {
    throw createMediaProcessingError(
      'invalid-image',
      'Cette photo est corrompue ou dépasse la limite de pixels.',
    )
  }

  if (!metadata.format || !supportedFormats.has(metadata.format)) {
    throw createMediaProcessingError(
      'unsupported-format',
      'Utilise une photo JPEG, PNG ou WebP.',
    )
  }

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > maxDimension ||
    metadata.height > maxDimension
  ) {
    throw createMediaProcessingError(
      'invalid-dimensions',
      'Les dimensions de cette photo sont invalides.',
    )
  }

  if ((metadata.pages ?? 1) > 1) {
    throw createMediaProcessingError(
      'animated-image',
      'Les images animées ou multipages ne sont pas acceptées.',
    )
  }

  try {
    const displayResult = await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true })
    const thumb = await sharp(displayResult.data, {
      failOn: 'warning',
      sequentialRead: true,
    })
      .resize({
        width: 640,
        height: 640,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 76 })
      .toBuffer()

    return {
      display: displayResult.data,
      thumb,
      displaySize: displayResult.data.length,
      thumbSize: thumb.length,
      totalSize: displayResult.data.length + thumb.length,
      width: displayResult.info.width,
      height: displayResult.info.height,
    }
  } catch {
    throw createMediaProcessingError(
      'invalid-image',
      'Cette photo n’a pas pu être optimisée.',
    )
  }
}

export const processImage = (input: Buffer): Promise<ProcessedImage> => enqueueImageProcessing(
  () => processImageImmediately(input),
)

export const processAvatarImage = async (input: Buffer, crop?: CropSelection): Promise<ProcessedAvatar> => {
  const processedImage = await processImage(input)
  const croppedImage = await cropImage(processedImage.thumb, crop)
  const data = await sharp(croppedImage, { failOn: 'warning' })
    .resize({ width: 256, height: 256, fit: 'cover', position: 'centre' })
    .webp({ quality: 68 })
    .toBuffer()

  return { data }
}

export const processBannerImage = async (input: Buffer, crop?: CropSelection): Promise<ProcessedBanner> => {
  const processedImage = await processImage(input)
  const croppedImage = await cropImage(processedImage.display, crop)
  const data = await sharp(croppedImage, { failOn: 'warning' })
    .resize({ width: 1600, height: 400, fit: 'cover', position: 'centre' })
    .webp({ quality: 78 })
    .toBuffer()

  return { data }
}
