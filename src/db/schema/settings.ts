import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { families } from './families'

export const settings = pgTable('settings', {
  familyId: uuid('family_id')
    .primaryKey()
    .references(() => families.id, { onDelete: 'cascade' }),
  dailyMessage: varchar('daily_message', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type FamilySettings = typeof settings.$inferSelect
export type NewFamilySettings = typeof settings.$inferInsert
