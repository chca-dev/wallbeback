import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleValues = ['admin', 'adult', 'child'] as const
export const themeModeValues = ['light', 'dark', 'system'] as const
export const themePaletteValues = ['violet', 'terracotta', 'ocean'] as const
export const postVisibilityValues = ['family', 'adults'] as const
export const calendarEventTypeValues = ['birthday', 'event'] as const

export type UserRole = (typeof userRoleValues)[number]
export type ThemeMode = (typeof themeModeValues)[number]
export type ThemePalette = (typeof themePaletteValues)[number]
export type PostVisibility = (typeof postVisibilityValues)[number]
export type CalendarEventType = (typeof calendarEventTypeValues)[number]

export const userRole = pgEnum('user_role', userRoleValues)
export const themeMode = pgEnum('theme_mode', themeModeValues)
export const themePalette = pgEnum('theme_palette', themePaletteValues)
export const postVisibility = pgEnum('post_visibility', postVisibilityValues)
export const calendarEventType = pgEnum('calendar_event_type', calendarEventTypeValues)
