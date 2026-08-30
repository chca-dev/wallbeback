import type { Metadata } from 'next'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { WallFeed, type WallPost } from '@/components/wall-feed'
import { WallBanner } from '@/components/wall-banner'
import { db } from '@/db/client'
import { photos } from '@/db/schema/photos'
import { settings } from '@/db/schema/settings'
import { users } from '@/db/schema/users'
import { posts, replies } from '@/db/schema/wall'
import type { AvatarTone } from '@/lib/avatar'
import { requireCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import { getBannerKing } from '@/lib/banner-rotation'

export const metadata: Metadata = { title: 'Le mur' }

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'

const formatDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
}).format(date)

const requestedPostIdSchema = z.string().uuid()
const postRelations = {
  author: {
    columns: {
      displayName: true as const,
      avatarTone: true as const,
      avatarStorageKey: true as const,
    },
  },
  replies: {
    orderBy: [asc(replies.createdAt)],
    with: {
      author: {
        columns: {
          displayName: true as const,
          avatarTone: true as const,
          avatarStorageKey: true as const,
        },
      },
    },
  },
  photos: {
    orderBy: [asc(photos.createdAt)],
  },
}

type WallPageProps = {
  searchParams: Promise<{ post?: string | string[] }>
}

const WallPage = async ({ searchParams }: WallPageProps) => {
  const currentUser = await requireCurrentUser()
  const resolvedSearchParams = await searchParams
  const rawRequestedPostId = Array.isArray(resolvedSearchParams.post)
    ? resolvedSearchParams.post[0]
    : resolvedSearchParams.post
  const parsedRequestedPostId = requestedPostIdSchema.safeParse(rawRequestedPostId)
  const requestedPostId = parsedRequestedPostId.success
    ? parsedRequestedPostId.data
    : null
  const visibilityCondition = currentUser.role === 'child'
    ? and(eq(posts.familyId, currentUser.familyId), eq(posts.visibility, 'family'))
    : eq(posts.familyId, currentUser.familyId)
  const [recentFamilyPosts, requestedPost, familyMembers, familySettings] = await Promise.all([
    db.query.posts.findMany({
      where: visibilityCondition,
      orderBy: [desc(posts.createdAt)],
      limit: 50,
      with: postRelations,
    }),
    requestedPostId
      ? db.query.posts.findFirst({
          where: and(
            visibilityCondition,
            eq(posts.id, requestedPostId),
          ),
          with: postRelations,
        })
      : Promise.resolve(undefined),
    db.select({ id: users.id, displayName: users.displayName, createdAt: users.createdAt }).from(users)
      .where(and(eq(users.familyId, currentUser.familyId), eq(users.isActive, true)))
      .orderBy(asc(users.createdAt), asc(users.id)),
    db.query.settings.findFirst({ where: eq(settings.familyId, currentUser.familyId), columns: { bannerStorageKey: true } }),
  ])
  const bannerKing = getBannerKing(familyMembers)
  const familyPosts = requestedPost && !recentFamilyPosts.some(({ id }) => id === requestedPost.id)
    ? [...recentFamilyPosts, requestedPost]
    : recentFamilyPosts
  const wallPosts: WallPost[] = familyPosts.map((post) => ({
    id: post.id,
    authorId: post.authorId,
    author: post.author.displayName,
    tone: getAvatarTone(post.author.avatarTone),
    avatarUrl: post.author.avatarStorageKey ? `/avatar/${post.authorId}` : null,
    content: post.content,
    time: formatDate(post.createdAt),
    adultsOnly: post.visibility === 'adults',
    photos: post.photos.map((photo) => ({
      id: photo.id,
      displayUrl: `/media/${photo.id}/display`,
      width: photo.width,
      height: photo.height,
    })),
    replies: post.replies.map((reply) => ({
      id: reply.id,
      authorId: reply.authorId,
      author: reply.author.displayName,
      tone: getAvatarTone(reply.author.avatarTone),
      avatarUrl: reply.author.avatarStorageKey ? `/avatar/${reply.authorId}` : null,
      content: reply.content,
      time: formatDate(reply.createdAt),
    })),
  }))

  return (
    <div className="mx-auto max-w-310 px-4 pb-24.5 pt-4 min-[521px]:px-5 min-[521px]:pb-25 min-[821px]:px-8 min-[821px]:pb-17.5 min-[1101px]:px-13">
      {bannerKing ? <WallBanner familyId={currentUser.familyId} kingName={bannerKing.displayName} canChange={currentUser.role === 'admin' || currentUser.id === bannerKing.id} hasBanner={Boolean(familySettings?.bannerStorageKey)} /> : null}

      <div className='mx-auto max-w-170'>
        <section aria-label='Fil familial' className='min-w-0'>
          <WallFeed
            maxUploadBytes={serverEnvironment.MAX_UPLOAD_BYTES}
            posts={wallPosts}
            currentUser={{
              id: currentUser.id,
              displayName: currentUser.displayName,
              familyName: currentUser.familyName,
              avatarTone: getAvatarTone(currentUser.avatarTone),
              avatarUrl: currentUser.avatarStorageKey ? `/avatar/${currentUser.id}` : null,
              isAdmin: currentUser.role === 'admin',
              canPublishAdults: currentUser.role !== 'child',
            }}
          />
        </section>
      </div>
    </div>
  )
}

export default WallPage
