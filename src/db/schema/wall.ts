import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { postVisibility } from './enums'
import { families } from './families'
import { users } from './users'

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    visibility: postVisibility('visibility').default('family').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('posts_family_created_at_idx').on(table.familyId, table.createdAt.desc()),
    index('posts_author_created_at_idx').on(table.authorId, table.createdAt.desc()),
  ],
)

export const replies = pgTable(
  'replies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('replies_post_created_at_idx').on(table.postId, table.createdAt),
    index('replies_author_created_at_idx').on(table.authorId, table.createdAt.desc()),
  ],
)

export const postReactions = pgTable(
  'post_reactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reaction: varchar('reaction', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('post_reactions_post_user_unique').on(table.postId, table.userId),
    index('post_reactions_family_post_idx').on(table.familyId, table.postId),
    check(
      'post_reactions_value_check',
      sql`${table.reaction} in ('heart', 'laugh', 'like', 'wow', 'sad', 'celebrate')`,
    ),
  ],
)

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Reply = typeof replies.$inferSelect
export type NewReply = typeof replies.$inferInsert
export type PostReaction = typeof postReactions.$inferSelect
export type NewPostReaction = typeof postReactions.$inferInsert
