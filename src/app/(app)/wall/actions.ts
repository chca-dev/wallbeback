'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import { postVisibilityValues } from '@/db/schema/enums'
import { posts, replies } from '@/db/schema/wall'
import { requireCurrentUser } from '@/lib/auth/session'

const contentSchema = z.string().trim().min(1, 'Écris un message.').max(5000, 'Le message est trop long.')

const createPostSchema = z.object({
  content: contentSchema,
  visibility: z.enum(postVisibilityValues),
})

const createReplySchema = z.object({
  postId: z.string().uuid(),
  content: contentSchema,
})

const updatePostSchema = z.object({
  postId: z.string().uuid(),
  content: contentSchema,
})

const updateReplySchema = z.object({
  replyId: z.string().uuid(),
  content: contentSchema,
})

const postIdSchema = z.object({ postId: z.string().uuid() })
const replyIdSchema = z.object({ replyId: z.string().uuid() })

export type WallActionState = {
  success?: string
  error?: string
  fieldErrors?: {
    content?: string[]
  }
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
  const currentUser = await requireCurrentUser()
  const parsed = createPostSchema.safeParse({
    content: formData.get('content'),
    visibility: formData.get('visibility'),
  })

  if (!parsed.success) {
    return getContentErrors(parsed.error)
  }

  if (currentUser.role === 'child' && parsed.data.visibility === 'adults') {
    return { error: 'Un profil enfant ne peut pas publier un message réservé aux adultes.' }
  }

  await db.insert(posts).values({
    familyId: currentUser.familyId,
    authorId: currentUser.id,
    content: parsed.data.content,
    visibility: parsed.data.visibility,
  })

  revalidatePath('/wall')
  return { success: 'Publication ajoutée.' }
}

export const createReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireCurrentUser()
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
  return { success: 'Réponse ajoutée.' }
}

export const updatePostAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireCurrentUser()
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
    .where(eq(posts.id, targetPost.id))

  revalidatePath('/wall')
  return { success: 'Publication modifiée.' }
}

export const deletePostAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireCurrentUser()
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

  await db.delete(posts).where(eq(posts.id, targetPost.id))

  revalidatePath('/wall')
  return { success: 'Publication supprimée.' }
}

export const updateReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireCurrentUser()
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
    .where(eq(replies.id, targetReply.id))

  revalidatePath('/wall')
  return { success: 'Réponse modifiée.' }
}

export const deleteReplyAction = async (
  _previousState: WallActionState,
  formData: FormData,
): Promise<WallActionState> => {
  const currentUser = await requireCurrentUser()
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

  await db.delete(replies).where(eq(replies.id, targetReply.id))

  revalidatePath('/wall')
  return { success: 'Réponse supprimée.' }
}
