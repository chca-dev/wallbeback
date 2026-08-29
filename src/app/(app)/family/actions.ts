'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'

export type MemberProfileActionState = { success?: string, error?: string }

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Ajoute un nom.').max(120, 'Le nom est trop long.'),
  avatarTone: z.enum(['blue', 'pink', 'cyan', 'lavender']),
})

export const updateMemberProfileAction = async (
  _previousState: MemberProfileActionState,
  formData: FormData,
): Promise<MemberProfileActionState> => {
  const currentUser = await requireCurrentUser()
  const parsed = profileSchema.safeParse({
    displayName: formData.get('displayName'),
    avatarTone: formData.get('avatarTone'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Profil invalide.' }

  await db.update(users).set(parsed.data).where(and(
    eq(users.id, currentUser.id),
    eq(users.familyId, currentUser.familyId),
  ))

  revalidatePath('/family')
  revalidatePath(`/family/${currentUser.id}`)
  return { success: 'Profil mis à jour.' }
}
