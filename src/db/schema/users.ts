import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { themeMode, themePalette, userRole } from './enums'
import { families } from './families'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 64 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    role: userRole('role').default('adult').notNull(),
    avatarTone: varchar('avatar_tone', { length: 32 }).default('blue').notNull(),
    avatarStorageKey: text('avatar_storage_key'),
    isActive: boolean('is_active').default(true).notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    themeMode: themeMode('theme_mode').default('system').notNull(),
    themePalette: themePalette('theme_palette').default('violet').notNull(),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('users_family_username_lower_unique').on(
      table.familyId,
      sql`lower(${table.username})`,
    ),
    uniqueIndex('users_family_email_lower_unique').on(
      table.familyId,
      sql`lower(${table.email})`,
    ),
    index('users_family_active_idx').on(table.familyId, table.isActive),
    check('users_failed_login_attempts_check', sql`${table.failedLoginAttempts} >= 0`),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
