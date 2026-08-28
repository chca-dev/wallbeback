'use server'

import bcrypt from 'bcryptjs'
import { and, count, eq, ne, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import { userRoleValues } from '@/db/schema/enums'
import { sessions } from '@/db/schema/sessions'
import { users } from '@/db/schema/users'
import { requireAdmin } from '@/lib/auth/session'

const avatarToneValues = ['blue', 'pink', 'cyan', 'lavender'] as const

const profileSchema = z.object({
  userId: z.string().uuid().optional(),
  displayName: z.string().trim().min(1, 'Saisis un nom affiché.').max(120),
  username: z
    .string()
    .trim()
    .min(3, 'L’identifiant doit contenir au moins 3 caractères.')
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Utilise uniquement lettres, chiffres, point, tiret et underscore.'),
  email: z.string().trim().email('Saisis un email valide.').max(320).transform((value) => value.toLowerCase()),
  role: z.enum(userRoleValues),
  avatarTone: z.enum(avatarToneValues),
})

const createUserSchema = profileSchema.extend({
  temporaryPassword: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.').max(128),
})

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  temporaryPassword: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.').max(128),
})

const userIdSchema = z.object({ userId: z.string().uuid() })

type UserField = 'displayName' | 'username' | 'email' | 'role' | 'avatarTone' | 'temporaryPassword'

export type UserActionState = {
  success?: string
  error?: string
  fieldErrors?: Partial<Record<UserField, string[]>>
}

const getFieldErrors = (error: z.ZodError) => {
  const fieldErrors: UserActionState['fieldErrors'] = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (typeof field !== 'string') {
      continue
    }

    const typedField = field as UserField
    fieldErrors[typedField] = [...(fieldErrors[typedField] ?? []), issue.message]
  }

  return fieldErrors
}

const revalidateUserViews = () => {
  revalidatePath('/admin/users')
  revalidatePath('/family')
}

const getActiveAdminCount = async (familyId: string) => {
  const [result] = await db
    .select({ value: count() })
    .from(users)
    .where(
      and(
        eq(users.familyId, familyId),
        eq(users.role, 'admin'),
        eq(users.isActive, true),
      ),
    )

  return result.value
}

const findIdentityConflict = async (
  familyId: string,
  username: string,
  email: string,
  excludedUserId?: string,
) => {
  const identityCondition = or(
    sql`lower(${users.username}) = ${username.toLowerCase()}`,
    sql`lower(${users.email}) = ${email.toLowerCase()}`,
  )

  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.familyId, familyId),
        identityCondition,
        excludedUserId ? ne(users.id, excludedUserId) : undefined,
      ),
    )
    .limit(1)

  return conflict ?? null
}

export const createUserAction = async (
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> => {
  const currentAdmin = await requireAdmin()
  const parsed = createUserSchema.safeParse({
    displayName: formData.get('displayName'),
    username: formData.get('username'),
    email: formData.get('email'),
    role: formData.get('role'),
    avatarTone: formData.get('avatarTone'),
    temporaryPassword: formData.get('temporaryPassword'),
  })

  if (!parsed.success) {
    return { fieldErrors: getFieldErrors(parsed.error) }
  }

  if (await findIdentityConflict(currentAdmin.familyId, parsed.data.username, parsed.data.email)) {
    return { error: 'Cet email ou cet identifiant est déjà utilisé.' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 12)

  await db.insert(users).values({
    familyId: currentAdmin.familyId,
    displayName: parsed.data.displayName,
    username: parsed.data.username,
    email: parsed.data.email,
    role: parsed.data.role,
    avatarTone: parsed.data.avatarTone,
    passwordHash,
    isActive: true,
    mustChangePassword: true,
  })

  revalidateUserViews()
  return { success: `Compte de ${parsed.data.displayName} créé.` }
}

export const updateUserAction = async (
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> => {
  const currentAdmin = await requireAdmin()
  const parsed = profileSchema.safeParse({
    userId: formData.get('userId'),
    displayName: formData.get('displayName'),
    username: formData.get('username'),
    email: formData.get('email'),
    role: formData.get('role'),
    avatarTone: formData.get('avatarTone'),
  })

  if (!parsed.success || !parsed.data.userId) {
    return parsed.success
      ? { error: 'Compte invalide.' }
      : { fieldErrors: getFieldErrors(parsed.error) }
  }

  const [target] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(
      and(
        eq(users.id, parsed.data.userId),
        eq(users.familyId, currentAdmin.familyId),
      ),
    )
    .limit(1)

  if (!target) {
    return { error: 'Compte introuvable.' }
  }

  if (
    target.role === 'admin'
    && target.isActive
    && parsed.data.role !== 'admin'
    && await getActiveAdminCount(currentAdmin.familyId) <= 1
  ) {
    return { error: 'Le dernier administrateur actif doit conserver son rôle.' }
  }

  if (
    await findIdentityConflict(
      currentAdmin.familyId,
      parsed.data.username,
      parsed.data.email,
      target.id,
    )
  ) {
    return { error: 'Cet email ou cet identifiant est déjà utilisé.' }
  }

  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        displayName: parsed.data.displayName,
        username: parsed.data.username,
        email: parsed.data.email,
        role: parsed.data.role,
        avatarTone: parsed.data.avatarTone,
      })
      .where(eq(users.id, target.id))

    if (target.role !== parsed.data.role) {
      await transaction.delete(sessions).where(eq(sessions.userId, target.id))
    }
  })

  revalidateUserViews()
  return { success: 'Profil mis à jour.' }
}

export const toggleUserStatusAction = async (
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> => {
  const currentAdmin = await requireAdmin()
  const parsed = userIdSchema.safeParse({ userId: formData.get('userId') })

  if (!parsed.success) {
    return { error: 'Compte invalide.' }
  }

  const [target] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(
      and(
        eq(users.id, parsed.data.userId),
        eq(users.familyId, currentAdmin.familyId),
      ),
    )
    .limit(1)

  if (!target) {
    return { error: 'Compte introuvable.' }
  }

  if (target.id === currentAdmin.id && target.isActive) {
    return { error: 'Tu ne peux pas désactiver ton propre compte.' }
  }

  if (
    target.isActive
    && target.role === 'admin'
    && await getActiveAdminCount(currentAdmin.familyId) <= 1
  ) {
    return { error: 'Le dernier administrateur actif ne peut pas être désactivé.' }
  }

  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ isActive: !target.isActive })
      .where(eq(users.id, target.id))

    if (target.isActive) {
      await transaction.delete(sessions).where(eq(sessions.userId, target.id))
    }
  })

  revalidateUserViews()
  return {
    success: target.isActive
      ? `Compte de ${target.displayName} désactivé.`
      : `Compte de ${target.displayName} réactivé.`,
  }
}

export const resetUserPasswordAction = async (
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> => {
  const currentAdmin = await requireAdmin()
  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get('userId'),
    temporaryPassword: formData.get('temporaryPassword'),
  })

  if (!parsed.success) {
    return { fieldErrors: getFieldErrors(parsed.error) }
  }

  if (parsed.data.userId === currentAdmin.id) {
    return { error: 'Utilise ton profil personnel pour changer ton propre mot de passe.' }
  }

  const [target] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(
      and(
        eq(users.id, parsed.data.userId),
        eq(users.familyId, currentAdmin.familyId),
      ),
    )
    .limit(1)

  if (!target) {
    return { error: 'Compte introuvable.' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 12)

  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, target.id))

    await transaction.delete(sessions).where(eq(sessions.userId, target.id))
  })

  revalidateUserViews()
  return { success: `Mot de passe temporaire défini pour ${target.displayName}.` }
}
