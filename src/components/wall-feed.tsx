'use client'

import { Lock, MessageCircle, Send } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Avatar } from '@/components/avatar'
import type { AvatarTone } from '@/lib/demo-data'

type Reply = {
  id: string
  author: string
  tone: AvatarTone
  content: string
  time: string
}

type Post = {
  id: string
  author: string
  tone: AvatarTone
  content: string
  time: string
  adultsOnly?: boolean
  replies: Reply[]
}

const initialPosts: Post[] = [
  {
    id: 'p1',
    author: 'Clara Martin',
    tone: 'pink',
    content: 'Petit rappel : dimanche on déjeune tous chez Mamie. J’apporte le dessert, mais quelqu’un peut penser au pain ?',
    time: 'Il y a 22 min',
    replies: [
      { id: 'r1', author: 'Thomas Martin', tone: 'blue', content: 'Je m’en occupe !', time: 'Il y a 8 min' },
      { id: 'r2', author: 'Mamie Jeanne', tone: 'pink', content: 'Et venez avec votre appétit ❤️', time: 'Il y a 3 min' },
    ],
  },
  {
    id: 'p2',
    author: 'Papi Gilou',
    tone: 'lavender',
    content: 'J’ai retrouvé les vieilles photos de Piriac. Il y a quelques chefs-d’œuvre capillaires qui méritent une exposition familiale.',
    time: 'Hier, 18:42',
    adultsOnly: true,
    replies: [],
  },
  {
    id: 'p3',
    author: 'Léa Martin',
    tone: 'cyan',
    content: 'Merci pour hier. C’était exactement le genre de dimanche qu’on devrait garder dans un bocal pour les semaines trop longues.',
    time: 'Samedi, 21:06',
    replies: [
      { id: 'r3', author: 'Emma Martin', tone: 'pink', content: 'On recommence vite.', time: 'Samedi, 21:14' },
    ],
  },
]

export const WallFeed = () => {
  const [posts, setPosts] = useState(initialPosts)
  const [content, setContent] = useState('')
  const [adultsOnly, setAdultsOnly] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const publish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = content.trim()
    if (!value) return
    setPosts((current) => [
      { id: crypto.randomUUID(), author: 'Cha', tone: 'blue', content: value, time: 'À l’instant', adultsOnly, replies: [] },
      ...current,
    ])
    setContent('')
    setAdultsOnly(false)
  }

  const submitReply = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault()
    const value = reply.trim()
    if (!value) return
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, replies: [...post.replies, { id: crypto.randomUUID(), author: 'Cha', tone: 'blue', content: value, time: 'À l’instant' }] }
      : post))
    setReply('')
    setReplyingTo(null)
  }

  return (
    <>
      <form
        onSubmit={publish}
        className={`mb-6 rounded-[18px] border bg-surface p-5 transition-colors ${adultsOnly ? 'border-secondary-soft' : 'border-border'}`}
      >
        <div className="mb-[14px] flex items-center gap-[11px]">
          <Avatar name="Cha" tone="blue" />
          <div>
            <strong className="block text-sm">Cha</strong>
            <span className="text-[11px] text-muted">Partagé avec {adultsOnly ? 'les adultes' : 'la famille Martin'}</span>
          </div>
          {adultsOnly ? <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary-soft px-2.5 py-1 text-[11px] font-bold text-secondary"><Lock size={11} /> Adultes</span> : null}
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Quoi de neuf chez vous ?"
          rows={3}
          className="min-h-[72px] w-full resize-y rounded-control border border-border bg-surface px-[14px] py-3 text-[15px] leading-[1.5] outline-none transition-colors placeholder:text-faint focus:border-primary"
        />
        <div className="mt-[14px] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            aria-pressed={adultsOnly}
            onClick={() => setAdultsOnly((current) => !current)}
            className={`flex items-center gap-[7px] rounded-[22px] border py-2 pl-3 pr-2.5 text-[11px] font-semibold transition-colors ${adultsOnly ? 'border-secondary bg-secondary-soft text-secondary' : 'border-border text-muted hover:border-secondary-soft'}`}
          >
            <Lock size={14} /> Adultes uniquement
          </button>
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-[9px] font-display text-[13px] font-semibold text-white transition-[transform,opacity] duration-150 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publier <Send size={14} />
          </button>
        </div>
      </form>

      <div>
        {posts.map((post) => (
          <article key={post.id} className={`mb-10 border-b border-border pb-[38px] ${post.adultsOnly ? 'border-l-[3px] border-l-secondary pl-4' : ''}`}>
            <header className="flex items-center gap-[13px]">
              <Avatar name={post.author} tone={post.tone} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{post.author}</strong>
                  {post.adultsOnly ? <span className="flex items-center gap-1 rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-bold text-secondary"><Lock size={10} /> Adultes</span> : null}
                </div>
                <span className="mt-[3px] block font-mono text-[10px] text-faint">{post.time}</span>
              </div>
            </header>
            <p className="mb-4 mt-[18px] text-[15px] leading-[1.6] tracking-[-0.01em]">{post.content}</p>
            <button
              type="button"
              onClick={() => setReplyingTo((current) => current === post.id ? null : post.id)}
              className="flex items-center gap-[5px] rounded-[10px] px-3 py-[7px] text-[11px] font-semibold text-muted transition-colors hover:bg-surface-soft hover:text-foreground"
            >
              <MessageCircle size={16} /> {post.replies.length} réponse{post.replies.length > 1 ? 's' : ''}
            </button>

            {post.replies.length ? (
              <div className="mt-2 space-y-[14px] border-l-2 border-primary-soft pb-1 pl-4 pt-5">
                {post.replies.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <Avatar name={item.author} tone={item.tone} size="sm" />
                    <div className="rounded-[4px_14px_14px_14px] bg-surface-soft px-3.5 py-2.5">
                      <strong className="block text-xs">{item.author}</strong>
                      <p className="mt-1 text-[13px] leading-5">{item.content}</p>
                      <span className="mt-1 block font-mono text-[9px] text-faint">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {replyingTo === post.id ? (
              <form onSubmit={(event) => submitReply(event, post.id)} className="mt-[14px] flex items-center gap-2.5 pl-[30px]">
                <Avatar name="Cha" tone="blue" size="sm" />
                <input
                  autoFocus
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Écrire une réponse…"
                  className="min-w-0 flex-1 rounded-[20px] border border-border bg-surface px-[14px] py-[9px] text-[13px] outline-none transition-colors placeholder:text-faint focus:border-primary"
                />
                <button type="submit" disabled={!reply.trim()} aria-label="Envoyer la réponse" className="grid size-[34px] place-items-center rounded-full bg-primary text-white transition-[transform,opacity] duration-150 enabled:hover:scale-[1.08] disabled:cursor-not-allowed disabled:opacity-30">
                  <Send size={15} />
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </>
  )
}
