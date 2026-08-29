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
