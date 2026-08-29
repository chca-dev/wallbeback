import { createHmac, randomBytes } from 'node:crypto'

import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/db/client'
import type { ThemeMode, ThemePalette, UserRole } from '@/db/schema/enums'
import { families } from '@/db/schema/families'
import { sessions } from '@/db/schema/sessions'
import { users } from '@/db/schema/users'
import { serverEnvironment } from '@/lib/env'

const sessionCookieName = 'wall_be_back_session'
const sessionDurationMilliseconds = 30 * 24 * 60 * 60 * 1000

export type CurrentUser = {
  sessionId: string
  id: string
  familyId: string
  familyName: string
  username: string
  email: string
  displayName: string
  role: UserRole
  avatarTone: string
  avatarStorageKey: string | null
  themeMode: ThemeMode
  themePalette: ThemePalette
  mustChangePassword: boolean
}

const hashSessionToken = (token: string) => createHmac('sha256', serverEnvironment.SESSION_SECRET)
  .update(token)
  .digest('hex')

const getSessionCookie = async () => (await cookies()).get(sessionCookieName)?.value

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionCookie()

  if (!token) {
    return null
  }

  const tokenHash = hashSessionToken(token)
  const [currentUser] = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      familyId: users.familyId,
      familyName: families.name,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      avatarTone: users.avatarTone,
      avatarStorageKey: users.avatarStorageKey,
      themeMode: users.themeMode,
      themePalette: users.themePalette,
      mustChangePassword: users.mustChangePassword,
    })
    .from(sessions)
    .innerJoin(
      users,
      and(
        eq(users.id, sessions.userId),
        eq(users.familyId, sessions.familyId),
        eq(users.isActive, true),
      ),
    )
    .innerJoin(families, eq(families.id, sessions.familyId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return currentUser ?? null
})

export const requireCurrentUser = async () => {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  return currentUser
}

export const requireAdmin = async () => {
  const currentUser = await requireCurrentUser()

  if (currentUser.role !== 'admin') {
    redirect('/wall')
  }

  return currentUser
}

export const createUserSession = async (userId: string, familyId: string) => {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionDurationMilliseconds)

  await db.insert(sessions).values({
    userId,
    familyId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
    priority: 'high',
  })
}

export const revokeCurrentSession = async () => {
  const token = await getSessionCookie()

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  const cookieStore = await cookies()
  cookieStore.delete(sessionCookieName)
}
