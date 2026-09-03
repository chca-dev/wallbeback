import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { events } from '@/db/schema/events'
import { families } from '@/db/schema/families'
import { loginRateLimits } from '@/db/schema/login-rate-limits'
import { photoPeople, photos } from '@/db/schema/photos'
import { pushSubscriptions } from '@/db/schema/push-subscriptions'
import {
  eventRelations,
  familyRelations,
  photoPeopleRelations,
  photoRelations,
  pushSubscriptionRelations,
  postRelations,
  replyRelations,
  sessionRelations,
  settingsRelations,
  userRelations,
} from '@/db/schema/relations'
import { sessions } from '@/db/schema/sessions'
import { settings } from '@/db/schema/settings'
import { users } from '@/db/schema/users'
import { posts, replies } from '@/db/schema/wall'
import { serverEnvironment } from '@/lib/env'

const schema = {
  events,
  eventRelations,
  families,
  familyRelations,
  loginRateLimits,
  photoPeople,
  photoPeopleRelations,
  photos,
  photoRelations,
  pushSubscriptions,
  pushSubscriptionRelations,
  posts,
  postRelations,
  replies,
  replyRelations,
  sessions,
  sessionRelations,
  settings,
  settingsRelations,
  users,
  userRelations,
}

type DatabaseGlobal = typeof globalThis & {
  wallBeBackDatabaseClient?: ReturnType<typeof postgres>
}

const databaseGlobal = globalThis as DatabaseGlobal

const databaseClient = databaseGlobal.wallBeBackDatabaseClient ?? postgres(
  serverEnvironment.DATABASE_URL,
  {
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
  },
)

if (process.env.NODE_ENV !== 'production') {
  databaseGlobal.wallBeBackDatabaseClient = databaseClient
}

export const db = drizzle(databaseClient, { schema })
