'use server'

import bcrypt from 'bcryptjs'
import { and, eq, ne, or, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db/client'
import { sessions } from '@/db/schema/sessions'
import { users } from '@/db/schema/users'
import {
  createUserSession,
  requireCurrentUser,
  revokeCurrentSession,
} from '@/lib/auth/session'

const maximumLoginAttempts = 5
const loginLockMilliseconds = 15 * 60 * 1000

const loginSchema = z.object({
  identity: z.string().trim().min(1, 'Saisis ton identifiant ou ton email.').max(320),
  password: z.string().min(1, 'Saisis ton mot de passe.').max(128),
})

const changePasswordSchema = z
  .object({
    password: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.').max(128),
    confirmation: z.string().max(128),
  })
  .refine((value) => value.password === value.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmation'],
  })

type LoginField = 'identity' | 'password'
type ChangePasswordField = 'password' | 'confirmation'

export type LoginActionState = {
  error?: string
  fieldErrors?: Partial<Record<LoginField, string[]>>
}

export type ChangePasswordActionState = {
  error?: string
  fieldErrors?: Partial<Record<ChangePasswordField, string[]>>
}

const getFieldErrors = <Field extends string>(error: z.ZodError) => {
  const fieldErrors: Partial<Record<Field, string[]>> = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (typeof field !== 'string') {
      continue
    }

    const currentErrors = fieldErrors[field as Field] ?? []
    fieldErrors[field as Field] = [...currentErrors, issue.message]
  }

  return fieldErrors
}

export const loginAction = async (
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const parsed = loginSchema.safeParse({
    identity: formData.get('identity'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { fieldErrors: getFieldErrors<LoginField>(parsed.error) }
  }

  const normalizedIdentity = parsed.data.identity.toLowerCase()
  const [account] = await db
    .select({
      id: users.id,
      familyId: users.familyId,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(
      or(
        sql`lower(${users.username}) = ${normalizedIdentity}`,
        sql`lower(${users.email}) = ${normalizedIdentity}`,
      ),
    )
    .limit(1)

  if (!account || !account.isActive) {
    return { error: 'Identifiant ou mot de passe incorrect.' }
  }

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    return { error: 'Compte temporairement verrouillé. Réessaie dans quelques minutes.' }
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, account.passwordHash)

  if (!passwordMatches) {
    const nextAttemptCount = account.failedLoginAttempts + 1
    const shouldLock = nextAttemptCount >= maximumLoginAttempts

    await db
      .update(users)
      .set({
        failedLoginAttempts: shouldLock ? 0 : nextAttemptCount,
        lockedUntil: shouldLock ? new Date(Date.now() + loginLockMilliseconds) : null,
      })
      .where(eq(users.id, account.id))

    return {
      error: shouldLock
        ? 'Compte temporairement verrouillé après plusieurs échecs.'
        : 'Identifiant ou mot de passe incorrect.',
    }
  }

  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, account.id))

  await createUserSession(account.id, account.familyId)
  redirect(account.mustChangePassword ? '/change-password' : '/wall')
}

export const logoutAction = async () => {
  await revokeCurrentSession()
  redirect('/login')
}

export const changePasswordAction = async (
  _previousState: ChangePasswordActionState,
  formData: FormData,
): Promise<ChangePasswordActionState> => {
  const currentUser = await requireCurrentUser()
  const parsed = changePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmation: formData.get('confirmation'),
  })

  if (!parsed.success) {
    return { fieldErrors: getFieldErrors<ChangePasswordField>(parsed.error) }
  }

  const [account] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, currentUser.id))
    .limit(1)

  if (!account) {
    return { error: 'Compte introuvable.' }
  }

  if (await bcrypt.compare(parsed.data.password, account.passwordHash)) {
    return { error: 'Choisis un mot de passe différent du mot de passe temporaire.' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, currentUser.id))

    await transaction
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, currentUser.id),
          ne(sessions.id, currentUser.sessionId),
        ),
      )
  })

  redirect('/wall')
}
