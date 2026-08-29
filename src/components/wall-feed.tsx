'use client'

import { Check, Lock, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { useActionState, useEffect, useState } from 'react'
import {
  createPostAction,
  createReplyAction,
  deletePostAction,
  deleteReplyAction,
  updatePostAction,
  updateReplyAction,
  type WallActionState,
} from '@/app/(app)/wall/actions'
import { Avatar } from '@/components/avatar'
import type { AvatarTone } from '@/lib/demo-data'

export type WallReply = {
  id: string
  authorId: string
  author: string
  tone: AvatarTone
  content: string
  time: string
}

export type WallPost = {
  id: string
  authorId: string
  author: string
  tone: AvatarTone
  content: string
  time: string
  adultsOnly?: boolean
  replies: WallReply[]
}

type WallFeedProps = {
  posts: WallPost[]
  currentUser: {
    id: string
    displayName: string
    familyName: string
    avatarTone: AvatarTone
    isAdmin: boolean
    canPublishAdults: boolean
  }
}

const initialState: WallActionState = {}

const Feedback = ({ state }: { state: WallActionState }) => {
  const message = state.error ?? state.fieldErrors?.content?.[0] ?? state.success

  if (!message) {
    return null
  }

  return (
    <p role="status" className={`mt-3 text-xs font-semibold ${state.error || state.fieldErrors ? 'text-danger' : 'text-primary-strong'}`}>
      {message}
    </p>
  )
}

const confirmDeletion = (message: string) => (event: FormEvent<HTMLFormElement>) => {
  if (!window.confirm(message)) {
    event.preventDefault()
  }
}

const ReplyForm = ({ postId, currentUser, onClose }: {
  postId: string
  currentUser: WallFeedProps['currentUser']
  onClose: () => void
}) => {
  const [state, formAction, pending] = useActionState(createReplyAction, initialState)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (state.success) {
      setContent('')
      onClose()
    }
  }, [state.success, onClose])

  return (
    <form action={formAction} className="mt-[14px] pl-[30px]">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-center gap-2.5">
        <Avatar name={currentUser.displayName} tone={currentUser.avatarTone} size="sm" />
        <input
          autoFocus
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          placeholder="Écrire une réponse…"
          className="min-w-0 flex-1 rounded-[20px] border border-border bg-surface px-[14px] py-[9px] text-[13px] outline-none transition-colors placeholder:text-faint focus:border-primary"
        />
        <button type="submit" disabled={pending || !content.trim()} aria-label="Envoyer la réponse" className="grid size-[34px] place-items-center rounded-full bg-primary text-white transition-[transform,opacity] duration-150 enabled:hover:scale-[1.08] disabled:cursor-not-allowed disabled:opacity-30">
          <Send size={15} />
        </button>
      </div>
      <Feedback state={state} />
    </form>
  )
}

const ReplyItem = ({ reply, currentUser }: {
  reply: WallReply
  currentUser: WallFeedProps['currentUser']
}) => {
  const canManage = currentUser.isAdmin || reply.authorId === currentUser.id
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(reply.content)
  const [updateState, updateAction, updatePending] = useActionState(updateReplyAction, initialState)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteReplyAction, initialState)

  useEffect(() => {
    if (updateState.success) {
      setEditing(false)
    }
  }, [updateState.success])

  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={reply.author} tone={reply.tone} size="sm" />
      <div className="min-w-0 flex-1 rounded-[4px_14px_14px_14px] bg-surface-soft px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <strong className="block min-w-0 flex-1 truncate text-xs">{reply.author}</strong>
          {canManage ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Modifier la réponse"
                onClick={() => setEditing((current) => !current)}
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
              >
                {editing ? <X size={12} /> : <Pencil size={12} />}
              </button>
              <form action={deleteAction} onSubmit={confirmDeletion('Supprimer définitivement cette réponse ?')}>
                <input type="hidden" name="replyId" value={reply.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  aria-label="Supprimer la réponse"
                  className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </form>
            </div>
          ) : null}
        </div>
        {editing ? (
          <form action={updateAction} className="mt-2">
            <input type="hidden" name="replyId" value={reply.id} />
            <textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full resize-y rounded-control border border-border bg-surface px-3 py-2 text-[13px] leading-5 outline-none focus:border-primary"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-control px-3 py-1.5 text-[11px] font-bold text-muted">Annuler</button>
              <button type="submit" disabled={updatePending || !content.trim()} className="inline-flex items-center gap-1 rounded-control bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
                <Check size={12} /> {updatePending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            <Feedback state={updateState} />
          </form>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">{reply.content}</p>
        )}
        <span className="mt-1 block font-mono text-[9px] text-faint">{reply.time}</span>
        <Feedback state={deleteState} />
      </div>
    </div>
  )
}

const PostCard = ({ post, currentUser }: { post: WallPost, currentUser: WallFeedProps['currentUser'] }) => {
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(post.content)
  const [updateState, updateAction, updatePending] = useActionState(updatePostAction, initialState)
  const [deleteState, deleteAction, deletePending] = useActionState(deletePostAction, initialState)
  const canManage = currentUser.isAdmin || post.authorId === currentUser.id

  useEffect(() => {
    if (updateState.success) {
      setEditing(false)
    }
  }, [updateState.success])

  return (
    <article className={`mb-10 border-b border-border pb-[38px] ${post.adultsOnly ? 'border-l-[3px] border-l-secondary pl-4' : ''}`}>
      <header className="flex items-center gap-[13px]">
        <Avatar name={post.author} tone={post.tone} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{post.author}</strong>
            {post.adultsOnly ? <span className="flex items-center gap-1 rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold text-secondary"><Lock size={10} /> Adultes</span> : null}
          </div>
          <span className="mt-[3px] block font-mono text-[10px] text-faint">{post.time}</span>
        </div>
        {canManage ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Modifier la publication"
              onClick={() => setEditing((current) => !current)}
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-soft hover:text-foreground"
            >
              {editing ? <X size={14} /> : <Pencil size={14} />}
            </button>
            <form action={deleteAction} onSubmit={confirmDeletion('Supprimer définitivement cette publication et toutes ses réponses ?')}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                disabled={deletePending}
                aria-label="Supprimer la publication"
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </form>
          </div>
        ) : null}
      </header>
      {editing ? (
        <form action={updateAction} className="mb-4 mt-[18px]">
          <input type="hidden" name="postId" value={post.id} />
          <textarea
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            rows={4}
            className="w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-[15px] leading-[1.6] outline-none focus:border-primary"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-control px-3 py-2 text-xs font-bold text-muted">Annuler</button>
            <button type="submit" disabled={updatePending || !content.trim()} className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
              <Check size={13} /> {updatePending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
          <Feedback state={updateState} />
        </form>
      ) : (
        <p className="mb-4 mt-[18px] whitespace-pre-wrap text-[15px] leading-[1.6] tracking-[-0.01em]">{post.content}</p>
      )}
      <Feedback state={deleteState} />
      <button
        type="button"
        aria-expanded={replying}
        onClick={() => setReplying((current) => !current)}
        className="flex items-center gap-[5px] rounded-[10px] px-3 py-[7px] text-[11px] font-semibold text-muted transition-colors hover:bg-surface-soft hover:text-foreground"
      >
        <MessageCircle size={16} /> {post.replies.length} réponse{post.replies.length > 1 ? 's' : ''}
      </button>

      {post.replies.length ? (
        <div className="mt-2 space-y-[14px] border-l-2 border-primary-soft pb-1 pl-4 pt-5">
          {post.replies.map((item) => (
            <ReplyItem key={item.id} reply={item} currentUser={currentUser} />
          ))}
        </div>
      ) : null}

      {replying ? (
        <ReplyForm postId={post.id} currentUser={currentUser} onClose={() => setReplying(false)} />
      ) : null}
    </article>
  )
}

export const WallFeed = ({ posts, currentUser }: WallFeedProps) => {
  const [state, formAction, pending] = useActionState(createPostAction, initialState)
  const [content, setContent] = useState('')
  const [adultsOnly, setAdultsOnly] = useState(false)

  useEffect(() => {
    if (state.success) {
      setContent('')
      setAdultsOnly(false)
    }
  }, [state.success])

  return (
    <>
      <form
        action={formAction}
        className={`mb-6 rounded-[18px] border bg-surface p-5 transition-colors ${adultsOnly ? 'border-secondary-soft' : 'border-border'}`}
      >
        <input type="hidden" name="visibility" value={adultsOnly ? 'adults' : 'family'} />
        <div className="mb-[14px] flex items-center gap-[11px]">
          <Avatar name={currentUser.displayName} tone={currentUser.avatarTone} />
          <div>
            <strong className="block text-sm">{currentUser.displayName}</strong>
            <span className="text-[11px] text-muted">Partagé avec {adultsOnly ? 'les adultes' : currentUser.familyName}</span>
          </div>
          {adultsOnly ? <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary-soft px-2.5 py-1 text-[11px] font-bold text-secondary"><Lock size={11} /> Adultes</span> : null}
        </div>
        <textarea
          value={content}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          placeholder="Quoi de neuf chez vous ?"
          rows={3}
          className="min-h-[72px] w-full resize-y rounded-control border border-border bg-surface px-[14px] py-3 text-[15px] leading-[1.5] outline-none transition-colors placeholder:text-faint focus:border-primary"
        />
        <div className="mt-[14px] flex flex-wrap items-center justify-end gap-3">
          {currentUser.canPublishAdults ? (
            <button
              type="button"
              aria-pressed={adultsOnly}
              onClick={() => setAdultsOnly((current) => !current)}
              className={`flex items-center gap-[7px] rounded-[22px] border py-2 pl-3 pr-2.5 text-[11px] font-semibold transition-colors ${adultsOnly ? 'border-secondary bg-secondary-soft text-secondary' : 'border-border text-muted hover:border-secondary-soft'}`}
            >
              <Lock size={14} /> Adultes uniquement
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending || !content.trim()}
            className="flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-[9px] font-display text-[13px] font-semibold text-white transition-[transform,opacity] duration-150 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Publication…' : 'Publier'} <Send size={14} />
          </button>
        </div>
        <Feedback state={state} />
      </form>

      <div>
        {posts.length ? posts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={currentUser} />
        )) : (
          <div className="rounded-card border border-dashed border-border bg-surface-soft px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold">Le mur est encore vide.</p>
            <p className="mt-2 text-sm text-muted">Écris le premier message de la famille.</p>
          </div>
        )}
      </div>
    </>
  )
}
