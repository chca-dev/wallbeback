import { index, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const loginRateLimits = pgTable(
  'login_rate_limits',
  {
    keyHash: varchar('key_hash', { length: 64 }).primaryKey(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true, mode: 'date' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('login_rate_limits_updated_at_idx').on(table.updatedAt),
  ],
)

export type LoginRateLimit = typeof loginRateLimits.$inferSelect
export type NewLoginRateLimit = typeof loginRateLimits.$inferInsert
