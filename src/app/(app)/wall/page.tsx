import type { Metadata } from 'next'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { WallFeed } from '@/components/wall-feed'
import { WallBanner } from '@/components/wall-banner'
import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { users } from '@/db/schema/users'
import type { AvatarTone } from '@/lib/avatar'
import { requireCurrentUser } from '@/lib/auth/session'
import { serverEnvironment } from '@/lib/env'
import { getBannerKing } from '@/lib/banner-rotation'
import { getWallPage } from '@/lib/wall/queries'

export const metadata: Metadata = { title: 'Le mur' }

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'

const requestedPostIdSchema = z.uuid()

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
  const [initialWallPage, familyMembers, familySettings] = await Promise.all([
    getWallPage({
      familyId: currentUser.familyId,
      currentUserId: currentUser.id,
      role: currentUser.role,
      highlightedPostId: requestedPostId,
    }),
    db.select({ id: users.id, displayName: users.displayName, createdAt: users.createdAt }).from(users)
      .where(and(eq(users.familyId, currentUser.familyId), eq(users.isActive, true)))
      .orderBy(asc(users.createdAt), asc(users.id)),
    db.query.settings.findFirst({ where: eq(settings.familyId, currentUser.familyId), columns: { bannerStorageKey: true } }),
  ])
  const bannerKing = getBannerKing(familyMembers)

  return (
    <div className="mx-auto max-w-310 px-4 pb-24.5 pt-4 min-[521px]:px-5 min-[521px]:pb-25 min-[821px]:px-8 min-[821px]:pb-17.5 min-[1101px]:px-13">
      {bannerKing ? <WallBanner familyId={currentUser.familyId} canChange={currentUser.role === 'admin' || currentUser.id === bannerKing.id} hasBanner={Boolean(familySettings?.bannerStorageKey)} /> : null}

      <div className='mx-auto max-w-170'>
        <section aria-label='Fil familial' className='min-w-0'>
          <WallFeed
            maxUploadBytes={serverEnvironment.MAX_UPLOAD_BYTES}
            initialPage={initialWallPage}
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
