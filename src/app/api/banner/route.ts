import { randomUUID } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { users } from '@/db/schema/users'
import { getCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import { getBannerKing } from '@/lib/banner-rotation'
import { isMediaProcessingError, processBannerImage } from '@/lib/media/process-image'
import { removeBannerImage, writeBannerImage } from '@/lib/media/storage'
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
  if (currentUser.mustChangePassword) return NextResponse.json({ message: 'Change ton mot de passe avant de modifier la bannière.' }, { status: 403 })
  const uploadError = validateMultipartUploadRequest(request, {
    maxBodyBytes: serverEnvironment.MAX_UPLOAD_BYTES + multipartOverheadBytes,
    tooLargeMessage: 'Cette image est trop lourde.',
  })
  if (uploadError) return NextResponse.json({ message: uploadError.message }, { status: uploadError.status })
  const familyMembers = await db.select({ id: users.id, createdAt: users.createdAt }).from(users)
    .where(and(eq(users.familyId, currentUser.familyId), eq(users.isActive, true)))
    .orderBy(asc(users.createdAt), asc(users.id))
  const bannerKing = getBannerKing(familyMembers)
  if (currentUser.role !== 'admin' && bannerKing?.id !== currentUser.id) return NextResponse.json({ message: 'Ce n’est pas ton tour de choisir la bannière.' }, { status: 403 })

  let formData: FormData
  try { formData = await request.formData() } catch { return NextResponse.json({ message: 'Le formulaire envoyé est invalide.' }, { status: 400 }) }
  const file = formData.get('file')
  const parsedCrop = parseCrop(formData.get('crop'))
  if (!(file instanceof File) || !file.size) return NextResponse.json({ message: 'Choisis une image.' }, { status: 400 })
  if (file.size > serverEnvironment.MAX_UPLOAD_BYTES) return NextResponse.json({ message: 'Cette image est trop lourde.' }, { status: 413 })
  if (file.type && !allowedMimeTypes.has(file.type)) return NextResponse.json({ message: 'Utilise une image JPEG, PNG ou WebP.' }, { status: 415 })
  if (!parsedCrop.success) return NextResponse.json({ message: 'Le cadrage est invalide.' }, { status: 400 })
  const existingSettings = await db.query.settings.findFirst({ where: eq(settings.familyId, currentUser.familyId) })
  const storageKey = randomUUID()
  try {
    const banner = await processBannerImage(Buffer.from(await file.arrayBuffer()), parsedCrop.data)
    await writeBannerImage(storageKey, banner)
    await db.insert(settings).values({ familyId: currentUser.familyId, bannerStorageKey: storageKey })
      .onConflictDoUpdate({ target: settings.familyId, set: { bannerStorageKey: storageKey } })
  } catch (error) {
    await removeBannerImage(storageKey).catch(() => undefined)
    return NextResponse.json({ message: isMediaProcessingError(error) ? error.message : 'La bannière n’a pas été enregistrée.' }, { status: 422 })
  }

  if (existingSettings?.bannerStorageKey && existingSettings.bannerStorageKey !== storageKey) {
    await removeBannerImage(existingSettings.bannerStorageKey).catch(() => undefined)
  }
  revalidatePath('/wall')
  return NextResponse.json({ success: true })
}
