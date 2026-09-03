import { and, eq, isNull, ne } from 'drizzle-orm'
import webPush from 'web-push'
import { db } from '@/db/client'
import { pushSubscriptions } from '@/db/schema/push-subscriptions'
import { users } from '@/db/schema/users'
import { posts } from '@/db/schema/wall'
import { serverEnvironment } from '@/lib/env'

const isPushConfigured = Boolean(
  serverEnvironment.WEB_PUSH_PUBLIC_KEY
  && serverEnvironment.WEB_PUSH_PRIVATE_KEY
  && serverEnvironment.WEB_PUSH_SUBJECT,
)

if (isPushConfigured) {
  webPush.setVapidDetails(
    serverEnvironment.WEB_PUSH_SUBJECT!,
    serverEnvironment.WEB_PUSH_PUBLIC_KEY!,
    serverEnvironment.WEB_PUSH_PRIVATE_KEY!,
  )
}

const getPushStatusCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  return typeof error.statusCode === 'number' ? error.statusCode : null
}

export const notifyFamilyAboutPost = async (postId: string, familyId: string) => {
  if (!isPushConfigured) return

  const [claimedPost] = await db
    .update(posts)
    .set({ pushNotifiedAt: new Date() })
    .where(and(
      eq(posts.id, postId),
      eq(posts.familyId, familyId),
      isNull(posts.pushNotifiedAt),
    ))
    .returning({
      authorId: posts.authorId,
      visibility: posts.visibility,
    })

  if (!claimedPost) return

  const [author] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, claimedPost.authorId), eq(users.familyId, familyId)))
    .limit(1)

  const recipients = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, and(
      eq(users.id, pushSubscriptions.userId),
      eq(users.familyId, pushSubscriptions.familyId),
      eq(users.isActive, true),
    ))
    .where(and(
      eq(pushSubscriptions.familyId, familyId),
      ne(pushSubscriptions.userId, claimedPost.authorId),
      claimedPost.visibility === 'adults' ? ne(users.role, 'child') : undefined,
    ))

  const payload = JSON.stringify({
    title: 'Wall Be Back',
    body: author ? `Nouvelle publication de ${author.displayName}` : 'Nouvelle publication familiale',
    url: `/wall#post-${postId}`,
    tag: `post-${postId}`,
  })

  await Promise.allSettled(recipients.map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload)
    } catch (error) {
      const statusCode = getPushStatusCode(error)
      if (statusCode === 404 || statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id))
        return
      }
      console.error('Échec d’envoi Web Push', { statusCode })
    }
  }))
}
