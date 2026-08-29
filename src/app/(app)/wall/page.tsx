import type { Metadata } from 'next'
import { and, asc, desc, eq } from 'drizzle-orm'
import { WallFeed, type WallPost } from '@/components/wall-feed'
import { PageHeading } from '@/components/page-heading'
import { db } from '@/db/client'
import { posts, replies } from '@/db/schema/wall'
import type { AvatarTone } from '@/lib/demo-data'
import { requireCurrentUser } from '@/lib/auth/session'

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

const WallPage = async () => {
  const currentUser = await requireCurrentUser()
  const visibilityCondition = currentUser.role === 'child'
    ? and(eq(posts.familyId, currentUser.familyId), eq(posts.visibility, 'family'))
    : eq(posts.familyId, currentUser.familyId)
  const familyPosts = await db.query.posts.findMany({
    where: visibilityCondition,
    orderBy: [desc(posts.createdAt)],
    limit: 50,
    with: {
      author: {
        columns: {
          displayName: true,
          avatarTone: true,
        },
      },
      replies: {
        orderBy: [asc(replies.createdAt)],
        with: {
          author: {
            columns: {
              displayName: true,
              avatarTone: true,
            },
          },
        },
      },
    },
  })
  const wallPosts: WallPost[] = familyPosts.map((post) => ({
    id: post.id,
    authorId: post.authorId,
    author: post.author.displayName,
    tone: getAvatarTone(post.author.avatarTone),
    content: post.content,
    time: formatDate(post.createdAt),
    adultsOnly: post.visibility === 'adults',
    replies: post.replies.map((reply) => ({
      id: reply.id,
      authorId: reply.authorId,
      author: reply.author.displayName,
      tone: getAvatarTone(reply.author.avatarTone),
      content: reply.content,
      time: formatDate(reply.createdAt),
    })),
  }))

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-[98px] pt-[29px] min-[521px]:px-5 min-[521px]:pb-[100px] min-[521px]:pt-[34px] min-[821px]:px-8 min-[821px]:pb-[70px] min-[821px]:pt-[52px] min-[1101px]:px-[52px]">
      <PageHeading
        eyebrow="Le mur de la famille"
        title="Ce qui se passe"
        accent="chez nous."
        description="Les petits moments, les grandes histoires et tout ce qu’on a envie de se raconter."
      />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,680px)_minmax(230px,290px)] lg:gap-12">
        <section aria-label="Fil familial" className="min-w-0">
          <WallFeed
            posts={wallPosts}
            currentUser={{
              id: currentUser.id,
              displayName: currentUser.displayName,
              familyName: currentUser.familyName,
              avatarTone: getAvatarTone(currentUser.avatarTone),
              isAdmin: currentUser.role === 'admin',
              canPublishAdults: currentUser.role !== 'child',
            }}
          />
        </section>
        <aside className="sticky top-28 hidden rounded-card border border-border bg-surface p-5 lg:block">
          <p className="font-display text-sm font-semibold">Un espace vraiment privé</p>
          <p className="mt-3 text-xs leading-6 text-muted">Seuls les membres invités par l’administrateur peuvent lire et écrire ici. Les publications marquées « Adultes » restent invisibles aux comptes enfants.</p>
        </aside>
      </div>
    </div>
  )
}

export default WallPage
