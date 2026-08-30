import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { posts } from '@/db/schema/wall'
import { getCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import { createStoredPhoto, isPhotoStorageError } from '@/lib/media/create-photo'
import {
  isMediaProcessingError,
  processImage,
} from '@/lib/media/process-image'
import { validateMultipartUploadRequest } from '@/lib/media/upload-request'

const multipartOverheadBytes = 1024 * 1024
const postIdSchema = z.uuid()
const maxUploadMegabytes = Math.round(
  serverEnvironment.MAX_UPLOAD_BYTES / (1024 * 1024) * 10,
) / 10
const fileTooLargeMessage = `Cette photo dépasse la limite de ${maxUploadMegabytes} Mo.`
const allowedDeclaredMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const runtime = 'nodejs'

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  }

  if (currentUser.mustChangePassword) {
    return NextResponse.json(
      { message: 'Change ton mot de passe avant d’ajouter une photo.' },
      { status: 403 },
    )
  }

  const uploadError = validateMultipartUploadRequest(request, {
    maxBodyBytes: serverEnvironment.MAX_UPLOAD_BYTES + multipartOverheadBytes,
    tooLargeMessage: fileTooLargeMessage,
  })

  if (uploadError) {
    return NextResponse.json(
      { message: uploadError.message },
      { status: uploadError.status },
    )
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { message: 'Le formulaire envoyé est invalide.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  const parsedPostId = postIdSchema.safeParse(formData.get('postId'))

  if (!parsedPostId.success) {
    return NextResponse.json(
      { message: 'Cette publication est invalide.' },
      { status: 400 },
    )
  }

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ message: 'Choisis une photo.' }, { status: 400 })
  }

  if (file.size > serverEnvironment.MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: fileTooLargeMessage },
      { status: 413 },
    )
  }

  if (file.type && !allowedDeclaredMimeTypes.has(file.type)) {
    return NextResponse.json(
      { message: 'Utilise une photo JPEG, PNG ou WebP.' },
      { status: 415 },
    )
  }

  const [targetPost] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(
      and(
        eq(posts.id, parsedPostId.data),
        eq(posts.familyId, currentUser.familyId),
      ),
    )
    .limit(1)

  if (!targetPost || targetPost.authorId !== currentUser.id) {
    return NextResponse.json(
      { message: 'Cette publication est introuvable ou inaccessible.' },
      { status: 404 },
    )
  }

  if (currentUser.role === 'child' && targetPost.visibility === 'adults') {
    return NextResponse.json({ message: 'Accès refusé.' }, { status: 403 })
  }

  try {
    const processedImage = await processImage(Buffer.from(await file.arrayBuffer()))
    const photo = await createStoredPhoto(
      currentUser,
      targetPost.id,
      file.name,
      processedImage,
    )

    revalidatePath('/wall')
    revalidatePath('/photos')

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    if (isMediaProcessingError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.code === 'file-too-large' ? 413 : 422 },
      )
    }

    if (isPhotoStorageError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.code === 'post-photo-limit' ? 409 : 507 },
      )
    }

    return NextResponse.json(
      { message: 'Cette photo n’a pas été enregistrée.' },
      { status: 500 },
    )
  }
}
