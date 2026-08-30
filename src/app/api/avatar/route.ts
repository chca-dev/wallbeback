import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { getCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import { isMediaProcessingError, processAvatarImage } from '@/lib/media/process-image'
import { removeAvatarImage, writeAvatarImage } from '@/lib/media/storage'
import { validateMultipartUploadRequest } from '@/lib/media/upload-request'

export const runtime = 'nodejs'
const cropSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), width: z.number().positive().max(100), height: z.number().positive().max(100) }).refine((crop) => crop.x + crop.width <= 100.01 && crop.y + crop.height <= 100.01)
const multipartOverheadBytes = 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const parseCrop = (value: FormDataEntryValue | null) => {
  try { return cropSchema.safeParse(JSON.parse(String(value))) } catch { return cropSchema.safeParse(null) }
}

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  if (currentUser.mustChangePassword) return NextResponse.json({ message: 'Change ton mot de passe avant de modifier ton avatar.' }, { status: 403 })
  const uploadError = validateMultipartUploadRequest(request, {
    maxBodyBytes: serverEnvironment.MAX_UPLOAD_BYTES + multipartOverheadBytes,
    tooLargeMessage: 'Cette image est trop lourde.',
  })
  if (uploadError) return NextResponse.json({ message: uploadError.message }, { status: uploadError.status })

  let formData: FormData
  try { formData = await request.formData() } catch { return NextResponse.json({ message: 'Le formulaire envoyé est invalide.' }, { status: 400 }) }
  const file = formData.get('file')
  const parsedCrop = parseCrop(formData.get('crop'))
  if (!(file instanceof File) || !file.size) return NextResponse.json({ message: 'Choisis une photo.' }, { status: 400 })
  if (file.size > serverEnvironment.MAX_UPLOAD_BYTES) return NextResponse.json({ message: 'Cette image est trop lourde.' }, { status: 413 })
  if (file.type && !allowedMimeTypes.has(file.type)) return NextResponse.json({ message: 'Utilise une image JPEG, PNG ou WebP.' }, { status: 415 })
  if (!parsedCrop.success) return NextResponse.json({ message: 'Le cadrage est invalide.' }, { status: 400 })

  const storageKey = randomUUID()
  const previousKey = currentUser.avatarStorageKey
  try {
    const image = await processAvatarImage(Buffer.from(await file.arrayBuffer()), parsedCrop.data)
    await writeAvatarImage(storageKey, image)
    await db.update(users).set({ avatarStorageKey: storageKey }).where(and(
      eq(users.id, currentUser.id),
      eq(users.familyId, currentUser.familyId),
    ))
  } catch (error) {
    await removeAvatarImage(storageKey).catch(() => undefined)
    return NextResponse.json({ message: isMediaProcessingError(error) ? error.message : 'L’avatar n’a pas été enregistré.' }, { status: 422 })
  }

  if (previousKey && previousKey !== storageKey) {
    await removeAvatarImage(previousKey).catch(() => undefined)
  }
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}

export const DELETE = async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  if (currentUser.mustChangePassword) return NextResponse.json({ message: 'Change ton mot de passe avant de modifier ton avatar.' }, { status: 403 })
  await db.update(users).set({ avatarStorageKey: null }).where(and(
    eq(users.id, currentUser.id),
    eq(users.familyId, currentUser.familyId),
  ))
  if (currentUser.avatarStorageKey) {
    await removeAvatarImage(currentUser.avatarStorageKey).catch(() => undefined)
  }
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}
