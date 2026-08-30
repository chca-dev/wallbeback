import 'server-only'

import { and, asc, desc, eq, lt, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import type { UserRole } from '@/db/schema/enums'
import { photos } from '@/db/schema/photos'
import { posts, replies } from '@/db/schema/wall'
import type { AvatarTone } from '@/lib/avatar'

export type CursorPage<Item> = {
  items: Item[]
  nextCursor: string | null
}

export type WallReply = {
  id: string
  authorId: string
  author: string
  tone: AvatarTone
  avatarUrl: string | null
  content: string
  time: string
}

export type WallPost = {
  id: string
  authorId: string
  author: string
  tone: AvatarTone
  avatarUrl: string | null
  content: string
  time: string
  adultsOnly?: boolean
  photos: {
    id: string
    displayUrl: string
    width: number
    height: number
  }[]
  replies: WallReply[]
  pending?: boolean
  pendingPhotos?: boolean
}

const wallCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
})
const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
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

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'

const formatDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
}).format(date)

const encodeWallCursor = (createdAt: Date, id: string) => Buffer
  .from(JSON.stringify({ createdAt: createdAt.toISOString(), id }))
  .toString('base64url')

const decodeWallCursor = (cursor: string | null) => {
  if (!cursor) return null

  try {
    const parsed = wallCursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    if (!parsed.success) throw new Error('Curseur invalide')
    return { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id }
  } catch {
    throw new Error('Curseur invalide')
  }
}

export const getWallPage = async ({
  familyId,
  role,
  cursor = null,
  highlightedPostId = null,
  limit = 20,
}: {
  familyId: string
  role: UserRole
  cursor?: string | null
  highlightedPostId?: string | null
  limit?: number
}): Promise<CursorPage<WallPost>> => {
  const decodedCursor = decodeWallCursor(cursor)
  const visibilityCondition = role === 'child'
    ? and(eq(posts.familyId, familyId), eq(posts.visibility, 'family'))
    : eq(posts.familyId, familyId)
  const cursorCondition = decodedCursor
    ? or(
        lt(posts.createdAt, decodedCursor.createdAt),
        and(eq(posts.createdAt, decodedCursor.createdAt), lt(posts.id, decodedCursor.id)),
      )
    : undefined
  const rows = await db.query.posts.findMany({
    where: and(visibilityCondition, cursorCondition),
    orderBy: [desc(posts.createdAt), desc(posts.id)],
    limit: limit + 1,
    with: postRelations,
  })
  const visibleRows = rows.slice(0, limit)
  const hasNextPage = rows.length > limit
  const highlightedPost = !cursor && highlightedPostId
    ? await db.query.posts.findFirst({
        where: and(visibilityCondition, eq(posts.id, highlightedPostId)),
        with: postRelations,
      })
    : undefined
  const pageRows = highlightedPost && !visibleRows.some(({ id }) => id === highlightedPost.id)
    ? [...visibleRows, highlightedPost]
    : visibleRows
  const lastRow = visibleRows.at(-1)
  const mapWallPost = (post: typeof pageRows[number]): WallPost => ({
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
  })

  return {
    items: pageRows.map(mapWallPost),
    nextCursor: hasNextPage && lastRow
      ? encodeWallCursor(lastRow.createdAt, lastRow.id)
      : null,
  }
}
