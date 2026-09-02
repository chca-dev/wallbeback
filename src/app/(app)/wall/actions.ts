'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import { postVisibilityValues } from '@/db/schema/enums'
import { photos } from '@/db/schema/photos'
import { postReactions, posts, replies } from '@/db/schema/wall'
import { requireReadyUser } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/action-result'
import { removeProcessedImage } from '@/lib/media/storage'
import { publishRealtimeEvent } from '@/lib/realtime/events'

const contentSchema = z.string().trim().max(5000, 'Le message est trop long.')
const requiredContentSchema = contentSchema.min(1, 'Écris un message.')

const createPostSchema = z
  .object({
    content: contentSchema,
    hasPhotos: z.enum(['true', 'false']).transform((value) => value === 'true'),
    visibility: z.enum(postVisibilityValues),
  })
  .refine(
    ({ content, hasPhotos }) => Boolean(content) || hasPhotos,
    { path: ['content'], message: 'Écris un message ou ajoute une photo.' },
  )

const createReplySchema = z.object({
  postId: z.uuid(),
  content: requiredContentSchema,
})

const updatePostSchema = z.object({
  postId: z.uuid(),
  content: requiredContentSchema,
})

const updateReplySchema = z.object({
  replyId: z.uuid(),
  content: requiredContentSchema,
})

const postIdSchema = z.object({ postId: z.uuid() })
const replyIdSchema = z.object({ replyId: z.uuid() })
const reactionSchema = z.object({
  postId: z.uuid(),
  reaction: z.enum(['heart', 'laugh', 'like', 'wow', 'sad', 'celebrate', 'poop']),
})

export type WallActionState = ActionResult<'content'> & {
  postId?: string
}

const getContentErrors = (error: z.ZodError): WallActionState => ({
  fieldErrors: {
    content: error.issues
      .filter((issue) => issue.path[0] === 'content')
      .map((issue) => issue.message),
  },
})

const getManagedPost = async (postId: string, familyId: string) => {
  const [post] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.familyId, familyId)))
    .limit(1)

  return post ?? null
}

const getManagedReply = async (replyId: string, familyId: string) => {
  const [reply] = await db
    .select({
      id: replies.id,
      authorId: replies.authorId,
      postVisibility: posts.visibility,
    })
    .from(replies)
    .innerJoin(
      posts,
      and(
        eq(posts.id, replies.postId),
        eq(posts.familyId, replies.familyId),
      ),
    )
    .where(and(eq(replies.id, replyId), eq(replies.familyId, familyId)))
    .limit(1)

  return reply ?? null
}

const canManageContent = (currentUserId: string, currentUserRole: string, authorId: string) => (
  currentUserRole === 'admin' || authorId === currentUserId
)

export const createPostAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = createPostSchema.safeParse({
    content: formData.get('content'),
    hasPhotos: formData.get('hasPhotos'),
    visibility: formData.get('visibility'),
  })

  if (!parsed.success) {
    return getContentErrors(parsed.error)
  }

  if (currentUser.role === 'child' && parsed.data.visibility === 'adults') {
    return { error: 'Un profil enfant ne peut pas publier un message réservé aux adultes.' }
  }

  const [post] = await db
    .insert(posts)
    .values({
      familyId: currentUser.familyId,
      authorId: currentUser.id,
      content: parsed.data.content,
      visibility: parsed.data.visibility,
    })
    .returning({ id: posts.id })

  revalidatePath('/wall')
  if (!parsed.data.hasPhotos) publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true, message: 'Publication ajoutée.', postId: post.id }
}

export const finalizePostAction = async (postId: string): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = z.uuid().safeParse(postId)
  if (!parsed.success) return { error: 'Publication invalide.' }

  const targetPost = await getManagedPost(parsed.data, currentUser.familyId)
  if (!targetPost || targetPost.authorId !== currentUser.id) {
    return { error: 'Cette publication est introuvable ou inaccessible.' }
  }

  revalidatePath('/wall')
  revalidatePath('/photos')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  publishRealtimeEvent(currentUser.familyId, 'photos.updated')
  return { success: true }
}

export const createReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = createReplySchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content'),
  })

  if (!parsed.success) {
    return getContentErrors(parsed.error)
  }

  const accessCondition = currentUser.role === 'child'
    ? and(
        eq(posts.id, parsed.data.postId),
        eq(posts.familyId, currentUser.familyId),
        eq(posts.visibility, 'family'),
      )
    : and(
        eq(posts.id, parsed.data.postId),
        eq(posts.familyId, currentUser.familyId),
      )

  const [targetPost] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(accessCondition)
    .limit(1)

  if (!targetPost) {
    return { error: 'Cette publication est introuvable ou inaccessible.' }
  }

  await db.insert(replies).values({
    familyId: currentUser.familyId,
    postId: targetPost.id,
    authorId: currentUser.id,
    content: parsed.data.content,
  })

  revalidatePath('/wall')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true, message: 'Réponse ajoutée.' }
}

export const togglePostReactionAction = async (
  postId: string,
  reaction: string,
): Promise<ActionResult> => {
  const currentUser = await requireReadyUser()
  const parsed = reactionSchema.safeParse({ postId, reaction })

  if (!parsed.success) return { error: 'Réaction invalide.' }

  const accessCondition = currentUser.role === 'child'
    ? and(
        eq(posts.id, parsed.data.postId),
        eq(posts.familyId, currentUser.familyId),
        eq(posts.visibility, 'family'),
      )
    : and(
        eq(posts.id, parsed.data.postId),
        eq(posts.familyId, currentUser.familyId),
      )
  const [targetPost] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(accessCondition)
    .limit(1)

  if (!targetPost) return { error: 'Cette publication est introuvable ou inaccessible.' }

  await db.transaction(async (transaction) => {
    const [currentReaction] = await transaction
      .select({
        id: postReactions.id,
        reaction: postReactions.reaction,
      })
      .from(postReactions)
      .where(and(
        eq(postReactions.postId, targetPost.id),
        eq(postReactions.userId, currentUser.id),
        eq(postReactions.familyId, currentUser.familyId),
      ))
      .limit(1)

    if (currentReaction?.reaction === parsed.data.reaction) {
      await transaction.delete(postReactions).where(eq(postReactions.id, currentReaction.id))
      return
    }

    await transaction
      .insert(postReactions)
      .values({
        familyId: currentUser.familyId,
        postId: targetPost.id,
        userId: currentUser.id,
        reaction: parsed.data.reaction,
      })
      .onConflictDoUpdate({
        target: [postReactions.postId, postReactions.userId],
        set: {
          reaction: parsed.data.reaction,
          updatedAt: new Date(),
        },
      })
  })

  revalidatePath('/wall')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true }
}

export const updatePostAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = updatePostSchema.safeParse({
    postId: formData.get('postId'),
    content: formData.get('content'),
  })

  if (!parsed.success) {
    return getContentErrors(parsed.error)
  }

  const targetPost = await getManagedPost(parsed.data.postId, currentUser.familyId)

  if (!targetPost || (currentUser.role === 'child' && targetPost.visibility === 'adults')) {
    return { error: 'Cette publication est introuvable ou inaccessible.' }
  }

  if (!canManageContent(currentUser.id, currentUser.role, targetPost.authorId)) {
    return { error: 'Tu ne peux pas modifier cette publication.' }
  }

  await db
    .update(posts)
    .set({ content: parsed.data.content })
    .where(and(eq(posts.id, targetPost.id), eq(posts.familyId, currentUser.familyId)))

  revalidatePath('/wall')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true, message: 'Publication modifiée.' }
}

export const deletePostAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = postIdSchema.safeParse({ postId: formData.get('postId') })

  if (!parsed.success) {
    return { error: 'Publication invalide.' }
  }

  const targetPost = await getManagedPost(parsed.data.postId, currentUser.familyId)

  if (!targetPost || (currentUser.role === 'child' && targetPost.visibility === 'adults')) {
    return { error: 'Cette publication est introuvable ou inaccessible.' }
  }

  if (!canManageContent(currentUser.id, currentUser.role, targetPost.authorId)) {
    return { error: 'Tu ne peux pas supprimer cette publication.' }
  }

  const attachedPhotos = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(
      and(
        eq(photos.postId, targetPost.id),
        eq(photos.familyId, currentUser.familyId),
      ),
    )

  await db.transaction(async (transaction) => {
    await transaction
      .delete(photos)
      .where(
        and(
          eq(photos.postId, targetPost.id),
          eq(photos.familyId, currentUser.familyId),
        ),
      )
    await transaction.delete(posts).where(and(
      eq(posts.id, targetPost.id),
      eq(posts.familyId, currentUser.familyId),
    ))
  })

  await Promise.allSettled(
    attachedPhotos.map(({ storageKey }) => removeProcessedImage(storageKey)),
  )

  revalidatePath('/wall')
  revalidatePath('/photos')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  publishRealtimeEvent(currentUser.familyId, 'photos.updated')
  return { success: true, message: 'Publication supprimée.' }
}

export const updateReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = updateReplySchema.safeParse({
    replyId: formData.get('replyId'),
    content: formData.get('content'),
  })

  if (!parsed.success) {
    return getContentErrors(parsed.error)
  }

  const targetReply = await getManagedReply(parsed.data.replyId, currentUser.familyId)

  if (!targetReply || (currentUser.role === 'child' && targetReply.postVisibility === 'adults')) {
    return { error: 'Cette réponse est introuvable ou inaccessible.' }
  }

  if (!canManageContent(currentUser.id, currentUser.role, targetReply.authorId)) {
    return { error: 'Tu ne peux pas modifier cette réponse.' }
  }

  await db
    .update(replies)
    .set({ content: parsed.data.content })
    .where(and(eq(replies.id, targetReply.id), eq(replies.familyId, currentUser.familyId)))

  revalidatePath('/wall')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true, message: 'Réponse modifiée.' }
}

export const deleteReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireReadyUser()
  const parsed = replyIdSchema.safeParse({ replyId: formData.get('replyId') })

  if (!parsed.success) {
    return { error: 'Réponse invalide.' }
  }

  const targetReply = await getManagedReply(parsed.data.replyId, currentUser.familyId)

  if (!targetReply || (currentUser.role === 'child' && targetReply.postVisibility === 'adults')) {
    return { error: 'Cette réponse est introuvable ou inaccessible.' }
  }

  if (!canManageContent(currentUser.id, currentUser.role, targetReply.authorId)) {
    return { error: 'Tu ne peux pas supprimer cette réponse.' }
  }

  await db.delete(replies).where(and(
    eq(replies.id, targetReply.id),
    eq(replies.familyId, currentUser.familyId),
  ))

  revalidatePath('/wall')
  publishRealtimeEvent(currentUser.familyId, 'wall.updated')
  return { success: true, message: 'Réponse supprimée.' }
}
