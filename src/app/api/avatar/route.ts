import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { getCurrentUser } from '@/lib/auth/session'
import { isMediaProcessingError, processAvatarImage } from '@/lib/media/process-image'
import { removeAvatarImage, writeAvatarImage } from '@/lib/media/storage'

export const runtime = 'nodejs'

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || !file.size) return NextResponse.json({ message: 'Choisis une photo.' }, { status: 400 })

  const storageKey = randomUUID()
  try {
    const image = await processAvatarImage(Buffer.from(await file.arrayBuffer()))
    await writeAvatarImage(storageKey, image)
    const previousKey = currentUser.avatarStorageKey
    await db.update(users).set({ avatarStorageKey: storageKey }).where(eq(users.id, currentUser.id))
    if (previousKey) await removeAvatarImage(previousKey)
    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (error) {
    await removeAvatarImage(storageKey).catch(() => undefined)
    return NextResponse.json({ message: isMediaProcessingError(error) ? error.message : 'L’avatar n’a pas été enregistré.' }, { status: 422 })
  }
}

export const DELETE = async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 })
  await db.update(users).set({ avatarStorageKey: null }).where(eq(users.id, currentUser.id))
  if (currentUser.avatarStorageKey) await removeAvatarImage(currentUser.avatarStorageKey)
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}
