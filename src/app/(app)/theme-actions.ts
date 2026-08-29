'use server'

import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/db/client'
import { themeModeValues, themePaletteValues } from '@/db/schema/enums'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'

const themeSchema = z.object({
  mode: z.enum(themeModeValues),
  palette: z.enum(themePaletteValues),
})

export const saveThemeAction = async (mode: string, palette: string) => {
  const currentUser = await requireCurrentUser()
  const parsed = themeSchema.safeParse({ mode, palette })
  if (!parsed.success) return { success: false as const, error: 'Thème invalide.' }

  await db.update(users).set({ themeMode: parsed.data.mode, themePalette: parsed.data.palette }).where(eq(users.id, currentUser.id))
  const cookieStore = await cookies()
  cookieStore.set('wall_be_back_theme', `${parsed.data.mode}:${parsed.data.palette}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  })
  return { success: true as const }
}
