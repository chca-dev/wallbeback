import { relations } from 'drizzle-orm'
import { events } from './events'
import { families } from './families'
import { photoPeople, photos } from './photos'
import { sessions } from './sessions'
import { settings } from './settings'
import { users } from './users'
import { posts, replies } from './wall'

export const familyRelations = relations(families, ({ many, one }) => ({
  users: many(users),
  sessions: many(sessions),
  posts: many(posts),
  replies: many(replies),
  photos: many(photos),
  events: many(events),
  settings: one(settings),
}))

export const userRelations = relations(users, ({ many, one }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  sessions: many(sessions),
  posts: many(posts),
  replies: many(replies),
  photos: many(photos),
  photoPeople: many(photoPeople),
  createdEvents: many(events, { relationName: 'eventCreator' }),
  linkedEvents: many(events, { relationName: 'eventMember' }),
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
  family: one(families, {
    fields: [sessions.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const postRelations = relations(posts, ({ many, one }) => ({
  family: one(families, {
    fields: [posts.familyId],
    references: [families.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  replies: many(replies),
  photos: many(photos),
}))

export const replyRelations = relations(replies, ({ one }) => ({
  family: one(families, {
    fields: [replies.familyId],
    references: [families.id],
  }),
  post: one(posts, {
    fields: [replies.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [replies.authorId],
    references: [users.id],
  }),
}))

export const photoRelations = relations(photos, ({ many, one }) => ({
  family: one(families, {
    fields: [photos.familyId],
    references: [families.id],
  }),
  owner: one(users, {
    fields: [photos.ownerId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [photos.postId],
    references: [posts.id],
  }),
  people: many(photoPeople),
}))

export const photoPeopleRelations = relations(photoPeople, ({ one }) => ({
  family: one(families, {
    fields: [photoPeople.familyId],
    references: [families.id],
  }),
  photo: one(photos, {
    fields: [photoPeople.photoId],
    references: [photos.id],
  }),
  user: one(users, {
    fields: [photoPeople.userId],
    references: [users.id],
  }),
}))

export const eventRelations = relations(events, ({ one }) => ({
  family: one(families, {
    fields: [events.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
    relationName: 'eventCreator',
  }),
  member: one(users, {
    fields: [events.memberId],
    references: [users.id],
    relationName: 'eventMember',
  }),
}))

export const settingsRelations = relations(settings, ({ one }) => ({
  family: one(families, {
    fields: [settings.familyId],
    references: [families.id],
  }),
}))
