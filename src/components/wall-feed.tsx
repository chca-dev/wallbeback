'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Lock,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useActionState, useEffect, useRef, useState } from 'react'
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
import type { AvatarTone } from '@/lib/avatar'

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
}

type WallFeedProps = {
  maxUploadBytes: number
  posts: WallPost[]
  currentUser: {
    id: string
    displayName: string
    familyName: string
    avatarTone: AvatarTone
    avatarUrl: string | null
    isAdmin: boolean
    canPublishAdults: boolean
  }
}

const initialState: WallActionState = {}

const Feedback = ({
  state,
  hideSuccess = false,
}: {
  state: WallActionState
  hideSuccess?: boolean
}) => {
  const message = state.error
    ?? state.fieldErrors?.content?.[0]
    ?? (hideSuccess ? undefined : state.message)

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
  const [content, setContent] = useState('')
  const submitReply = async (
    previousState: WallActionState,
    formData: FormData,
  ) => {
    const nextState = await createReplyAction(previousState, formData)

    if (nextState.success) {
      setContent('')
      onClose()
    }

    return nextState
  }
  const [state, formAction, pending] = useActionState(submitReply, initialState)

  return (
    <form action={formAction} className="mt-3.5 pl-7.5">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-center gap-2.5">
        <Avatar name={currentUser.displayName} tone={currentUser.avatarTone} imageUrl={currentUser.avatarUrl} size="sm" />
        <input
          autoFocus
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          placeholder="Écrire une réponse…"
          className="min-w-0 flex-1 rounded-[20px] border border-border bg-surface px-3.5 py-2.25 text-[13px] outline-none transition-colors placeholder:text-faint focus:border-primary"
        />
        <button type="submit" disabled={pending || !content.trim()} aria-label="Envoyer la réponse" className="grid size-8.5 place-items-center rounded-full bg-primary text-white transition-[transform,opacity] duration-150 enabled:hover:scale-[1.08] disabled:cursor-not-allowed disabled:opacity-30">
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
  const [deleteState, deleteAction, deletePending] = useActionState(deleteReplyAction, initialState)
  const submitUpdate = async (
    previousState: WallActionState,
    formData: FormData,
  ) => {
    const nextState = await updateReplyAction(previousState, formData)

    if (nextState.success) {
      setEditing(false)
    }

    return nextState
  }
  const [updateState, updateAction, updatePending] = useActionState(submitUpdate, initialState)

  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={reply.author} tone={reply.tone} imageUrl={reply.avatarUrl} size="sm" />
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
  const [deleteState, deleteAction, deletePending] = useActionState(deletePostAction, initialState)
  const canManage = currentUser.isAdmin || post.authorId === currentUser.id
  const submitUpdate = async (
    previousState: WallActionState,
    formData: FormData,
  ) => {
    const nextState = await updatePostAction(previousState, formData)

    if (nextState.success) {
      setEditing(false)
    }

    return nextState
  }
  const [updateState, updateAction, updatePending] = useActionState(submitUpdate, initialState)

  return (
    <article id={`post-${post.id}`} className={`mb-10 scroll-mt-28 border-b border-border pb-9.5 ${post.adultsOnly ? 'border-l-[3px] border-l-secondary pl-4' : ''}`}>
      <header className="flex items-center gap-3.25">
      <Avatar name={post.author} tone={post.tone} imageUrl={post.avatarUrl} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{post.author}</strong>
            {post.adultsOnly ? <span className="flex items-center gap-1 rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold text-secondary"><Lock size={10} /> Adultes</span> : null}
          </div>
          <span className="mt-0.75 block font-mono text-[10px] text-faint">{post.time}</span>
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
            <form action={deleteAction} onSubmit={confirmDeletion('Supprimer définitivement cette publication, ses photos et toutes ses réponses ?')}>
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
        <form action={updateAction} className="mb-4 mt-4.5">
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
      ) : post.content ? (
        <p className="mb-4 mt-4.5 whitespace-pre-wrap text-[15px] leading-[1.6] tracking-[-0.01em]">{post.content}</p>
      ) : null}
      {post.photos.length ? (
        <div className='mb-4 grid grid-cols-2 gap-2 overflow-hidden rounded-2xl'>
          {post.photos.map((photo, index) => {
            const isWide = post.photos.length === 1 || (
              post.photos.length % 2 === 1 && index === 0
            )

            return (
              <a
                key={photo.id}
                href={photo.displayUrl}
                target='_blank'
                rel='noreferrer'
                aria-label={`Ouvrir la photo ${index + 1} de la publication`}
                className={`group relative overflow-hidden bg-surface-soft ${isWide ? 'col-span-2 aspect-16/10' : 'aspect-square'}`}
              >
                <Image
                  src={photo.displayUrl}
                  alt={`Photo publiée par ${post.author}`}
                  fill
                  unoptimized
                  sizes={isWide ? '(max-width: 820px) 100vw, 680px' : '(max-width: 820px) 50vw, 340px'}
                  className='object-cover transition-transform duration-500 group-hover:scale-[1.03]'
                />
              </a>
            )
          })}
        </div>
      ) : null}
      <Feedback state={deleteState} />
      <button
        type="button"
        aria-expanded={replying}
        onClick={() => setReplying((current) => !current)}
        className="flex items-center gap-1.25 rounded-[10px] px-3 py-1.75 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-soft hover:text-foreground"
      >
        <MessageCircle size={16} /> {post.replies.length} réponse{post.replies.length > 1 ? 's' : ''}
      </button>

      {post.replies.length ? (
        <div className="mt-2 space-y-3.5 border-l-2 border-primary-soft pb-1 pl-4 pt-5">
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

type PhotoMessage = {
  tone: 'error' | 'success'
  text: string
}

const maxSelectedFiles = 6
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const getResponseMessage = (payload: unknown) => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return null
}

const SelectedPhotoPreview = ({
  file,
  index,
  onRemove,
}: {
  file: File
  index: number
  onRemove: () => void
}) => {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const previewUrl = URL.createObjectURL(file)

    if (imageRef.current) imageRef.current.src = previewUrl

    return () => URL.revokeObjectURL(previewUrl)
  }, [file])

  return (
    <div className='relative aspect-square overflow-hidden rounded-[12px] bg-surface-soft'>
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable application image */}
      <img
        ref={imageRef}
        alt={`Photo sélectionnée ${index + 1}`}
        className='absolute inset-0 size-full object-cover'
      />
      <button
        type='button'
        onClick={onRemove}
        aria-label={`Retirer la photo ${index + 1}`}
        className='absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full bg-black/65 text-white transition hover:bg-black/80'
      >
        <X size={13} />
      </button>
    </div>
  )
}

export const WallFeed = ({
  maxUploadBytes,
  posts,
  currentUser,
}: WallFeedProps) => {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const handledPostIdRef = useRef<string | null>(null)
  const [content, setContent] = useState('')
  const [adultsOnly, setAdultsOnly] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [photoMessage, setPhotoMessage] = useState<PhotoMessage | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const submitPost = async (
    previousState: WallActionState,
    formData: FormData,
  ) => {
    const nextState = await createPostAction(previousState, formData)

    if (nextState.success && formData.get('hasPhotos') !== 'true') {
      setContent('')
      setAdultsOnly(false)
      setPhotoMessage(null)
    }

    return nextState
  }
  const [state, formAction, pending] = useActionState(submitPost, initialState)
  const isUploading = uploadProgress !== null
  const maxUploadMegabytes = Math.round(maxUploadBytes / (1024 * 1024) * 10) / 10

  useEffect(() => {
    if (!state.success || !state.postId || handledPostIdRef.current === state.postId) {
      return
    }

    handledPostIdRef.current = state.postId
    const filesToUpload = selectedFiles
    const publishedContent = content

    if (!filesToUpload.length) return

    let cancelled = false

    const uploadPhotos = async () => {
      const errors: string[] = []
      let uploadedCount = 0

      for (const [index, file] of filesToUpload.entries()) {
        if (cancelled) return

        setUploadProgress({ completed: index, total: filesToUpload.length })
        const photoFormData = new FormData()
        photoFormData.append('file', file)
        photoFormData.append('postId', state.postId as string)

        try {
          const response = await fetch('/api/photos', {
            method: 'POST',
            body: photoFormData,
          })
          const payload: unknown = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(getResponseMessage(payload) ?? `${file.name} n’a pas été envoyée.`)
          }

          uploadedCount += 1
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `${file.name} n’a pas été envoyée.`)
        }
      }

      if (cancelled) return

      if (!uploadedCount && !publishedContent.trim()) {
        const deleteFormData = new FormData()
        deleteFormData.append('postId', state.postId as string)
        const deletionState = await deletePostAction(initialState, deleteFormData)
        setPhotoMessage({
          tone: 'error',
          text: deletionState.error
            ? `Aucune photo n’a pu être ajoutée. ${deletionState.error}`
            : 'Aucune photo n’a pu être ajoutée. La publication vide a été supprimée.',
        })
      } else if (errors.length) {
        setPhotoMessage({
          tone: 'error',
          text: `${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} ajoutée${uploadedCount > 1 ? 's' : ''}. ${errors.length} envoi${errors.length > 1 ? 's' : ''} a échoué.`,
        })
      } else {
        setPhotoMessage({
          tone: 'success',
          text: `Publication et ${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} ajoutées.`,
        })
      }

      router.refresh()
      setSelectedFiles([])
      setContent('')
      setAdultsOnly(false)
      setUploadProgress(null)
    }

    void uploadPhotos()

    return () => {
      cancelled = true
    }
  }, [content, router, selectedFiles, state.postId, state.success])

  const selectPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!newFiles.length) return

    if (selectedFiles.length + newFiles.length > maxSelectedFiles) {
      setPhotoMessage({
        tone: 'error',
        text: `Ajoute au maximum ${maxSelectedFiles} photos par publication.`,
      })
      return
    }

    const unsupportedFile = newFiles.find((file) => (
      file.type && !allowedMimeTypes.has(file.type)
    ))

    if (unsupportedFile) {
      setPhotoMessage({
        tone: 'error',
        text: `${unsupportedFile.name} n’est pas un fichier JPEG, PNG ou WebP.`,
      })
      return
    }

    const oversizedFile = newFiles.find((file) => file.size > maxUploadBytes)

    if (oversizedFile) {
      setPhotoMessage({
        tone: 'error',
        text: `${oversizedFile.name} dépasse la limite de ${maxUploadMegabytes} Mo.`,
      })
      return
    }

    setSelectedFiles((currentFiles) => [...currentFiles, ...newFiles])
    setPhotoMessage(null)
  }

  const removeSelectedPhoto = (index: number) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))
    setPhotoMessage(null)
  }

  return (
    <>
      <form
        action={formAction}
        className={`mb-6 rounded-card border bg-surface p-5 transition-colors ${adultsOnly ? 'border-secondary-soft' : 'border-border'}`}
      >
        <input type='hidden' name='visibility' value={adultsOnly ? 'adults' : 'family'} />
        <input type='hidden' name='hasPhotos' value={selectedFiles.length ? 'true' : 'false'} />
        <input
          ref={photoInputRef}
          type='file'
          multiple
          accept='image/jpeg,image/png,image/webp'
          aria-label='Choisir des photos pour la publication'
          className='sr-only'
          onChange={selectPhotos}
        />
        <div className='mb-3.5 flex items-center gap-2.75'>
          <Avatar name={currentUser.displayName} tone={currentUser.avatarTone} imageUrl={currentUser.avatarUrl} />
          <div>
            <strong className='block text-sm'>{currentUser.displayName}</strong>
            <span className='text-[11px] text-muted'>
              Partagé avec {adultsOnly ? 'les adultes' : currentUser.familyName}
            </span>
          </div>
          {adultsOnly ? (
            <span className='ml-auto flex items-center gap-1 rounded-full bg-secondary-soft px-2.5 py-1 text-[11px] font-bold text-secondary'>
              <Lock size={11} /> Adultes
            </span>
          ) : null}
        </div>
        <textarea
          value={content}
          name='content'
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          placeholder='Quoi de neuf chez vous ?'
          rows={3}
          className='min-h-18 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-[15px] leading-normal outline-none transition-colors placeholder:text-faint focus:border-primary'
        />

        {selectedFiles.length ? (
          <div className='mt-3 grid grid-cols-3 gap-2 min-[521px]:grid-cols-6'>
            {selectedFiles.map((file, index) => (
              <SelectedPhotoPreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                index={index}
                onRemove={() => removeSelectedPhoto(index)}
              />
            ))}
          </div>
        ) : null}

        <div className='mt-3.5 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            disabled={pending || isUploading || selectedFiles.length >= maxSelectedFiles}
            onClick={() => photoInputRef.current?.click()}
            className='flex min-h-9 items-center gap-1.5 rounded-[22px] border border-border px-3 text-[11px] font-semibold text-muted transition-colors hover:border-primary-soft hover:text-foreground disabled:pointer-events-none disabled:opacity-40'
          >
            <ImagePlus size={15} /> Photos{selectedFiles.length ? ` (${selectedFiles.length})` : ''}
          </button>
          <div className='ml-auto flex flex-wrap items-center justify-end gap-3'>
            {currentUser.canPublishAdults ? (
              <button
                type='button'
                aria-pressed={adultsOnly}
                disabled={pending || isUploading}
                onClick={() => setAdultsOnly((current) => !current)}
                className={`flex items-center gap-1.75 rounded-[22px] border py-2 pl-3 pr-2.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${adultsOnly ? 'border-secondary bg-secondary-soft text-secondary' : 'border-border text-muted hover:border-secondary-soft'}`}
              >
                <Lock size={14} /> Adultes uniquement
              </button>
            ) : null}
            <button
              type='submit'
              disabled={pending || isUploading || (!content.trim() && !selectedFiles.length)}
              className='flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.25 font-display text-[13px] font-semibold text-white transition-[transform,opacity] duration-150 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40'
            >
              {pending || isUploading
                ? <LoaderCircle aria-hidden='true' size={14} className='animate-spin' />
                : null}
              {pending ? 'Publication…' : isUploading ? 'Photos…' : 'Publier'}
              {!pending && !isUploading ? <Send size={14} /> : null}
            </button>
          </div>
        </div>

        {uploadProgress ? (
          <p role='status' aria-live='polite' className='mt-3 text-xs font-semibold text-primary-strong'>
            Optimisation de la photo {uploadProgress.completed + 1} sur {uploadProgress.total}…
          </p>
        ) : null}
        {photoMessage ? (
          <p
            role={photoMessage.tone === 'error' ? 'alert' : 'status'}
            aria-live='polite'
            className={`mt-3 text-xs font-semibold ${photoMessage.tone === 'error' ? 'text-danger' : 'text-success'}`}
          >
            {photoMessage.text}
          </p>
        ) : null}
        <Feedback state={state} hideSuccess={isUploading || photoMessage !== null} />
      </form>

      <div>
        {posts.length ? posts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={currentUser} />
        )) : (
          <div className='rounded-card border border-dashed border-border bg-surface-soft px-6 py-12 text-center'>
            <p className='font-display text-lg font-semibold'>Le mur est encore vide.</p>
            <p className='mt-2 text-sm text-muted'>Publie le premier message ou souvenir de la famille.</p>
          </div>
        )}
      </div>
    </>
  )
}
