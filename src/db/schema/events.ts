import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { calendarEventType } from './enums'
import { families } from './families'
import { users } from './users'

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    memberId: uuid('member_id').references(() => users.id, { onDelete: 'set null' }),
    type: calendarEventType('type').default('event').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }),
    allDay: boolean('all_day').default(false).notNull(),
    repeatsYearly: boolean('repeats_yearly').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('events_family_starts_at_idx').on(table.familyId, table.startsAt),
    index('events_member_starts_at_idx').on(table.memberId, table.startsAt),
    check('events_end_after_start_check', sql`${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt}`),
  ],
)

export type CalendarEvent = typeof events.$inferSelect
export type NewCalendarEvent = typeof events.$inferInsert
