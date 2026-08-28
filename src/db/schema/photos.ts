import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { families } from './families'
import { users } from './users'
import { posts } from './wall'

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
    storageKey: text('storage_key').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 64 }).notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    caption: varchar('caption', { length: 500 }),
    takenAt: timestamp('taken_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('photos_storage_key_unique').on(table.storageKey),
    index('photos_family_taken_at_idx').on(table.familyId, table.takenAt.desc()),
    index('photos_owner_created_at_idx').on(table.ownerId, table.createdAt.desc()),
    index('photos_post_idx').on(table.postId),
  ],
)

export const photoPeople = pgTable(
  'photo_people',
  {
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    photoId: uuid('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ name: 'photo_people_photo_user_pk', columns: [table.photoId, table.userId] }),
    index('photo_people_family_user_idx').on(table.familyId, table.userId),
  ],
)

export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
export type PhotoPerson = typeof photoPeople.$inferSelect
