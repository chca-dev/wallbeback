import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { families } from './families'
import { users } from './users'

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_unique').on(table.endpoint),
    index('push_subscriptions_family_user_idx').on(table.familyId, table.userId),
  ],
)

export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
