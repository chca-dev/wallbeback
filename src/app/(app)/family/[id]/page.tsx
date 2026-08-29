import type { Metadata } from 'next'
import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/avatar'
import { MemberProfileForm } from '@/components/member-profile-form'
import { db } from '@/db/client'
import type { UserRole } from '@/db/schema/enums'
import { events } from '@/db/schema/events'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'
import type { AvatarTone } from '@/lib/demo-data'

export const metadata: Metadata = { title: 'Membre de la famille' }
type MemberPageProps = { params: Promise<{ id: string }> }
const roleLabels: Record<UserRole, string> = { admin: 'Administrateur', adult: 'Adulte', child: 'Enfant' }
const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone) ? tone as AvatarTone : 'blue'
const formatEventDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(date)

const MemberPage = async ({ params }: MemberPageProps) => {
  const currentUser = await requireCurrentUser()
  const { id } = await params
  const member = await db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.familyId, currentUser.familyId), eq(users.isActive, true)) })
  if (!member) notFound()

  const memberEvents = await db.select().from(events).where(and(eq(events.familyId, currentUser.familyId), eq(events.memberId, member.id))).orderBy(asc(events.startsAt)).limit(20)
  const now = new Date()
  const upcoming = memberEvents.map((event) => {
    if (!event.repeatsYearly || event.startsAt >= now) return event
    const next = new Date(event.startsAt)
    next.setUTCFullYear(now.getUTCFullYear())
    if (next < now) next.setUTCFullYear(now.getUTCFullYear() + 1)
    return { ...event, startsAt: next }
  }).filter((event) => event.startsAt >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 5)

  return <div className='mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 md:pb-16 lg:px-13'>
    <Link href='/family' className='mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground'><ArrowLeft size={15} /> Retour à la famille</Link>
    <header className='flex items-center gap-4 rounded-card border border-border bg-surface p-6'><Avatar name={member.displayName} tone={getAvatarTone(member.avatarTone)} imageUrl={member.avatarStorageKey ? `/avatar/${member.id}` : null} size='lg' /><div><h1 className='font-display text-2xl font-semibold'>{member.displayName}</h1><p className='mt-1 text-xs text-muted'>Niveau d’accès : {roleLabels[member.role]}</p></div></header>
    <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'><main className='space-y-6'>
      <section className='rounded-card border border-border bg-surface p-5'><h2 className='flex items-center gap-2 font-display text-lg font-semibold'><CalendarDays size={18} /> Prochains événements</h2>{upcoming.length ? <div className='mt-4 space-y-2'>{upcoming.map((event) => <Link key={event.id} href={`/calendar?month=${event.startsAt.toISOString().slice(0, 7)}`} className='block rounded-xl bg-surface-soft p-3'><strong className='text-sm'>{event.title}</strong><p className='mt-1 text-xs capitalize text-muted'>{event.allDay ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(event.startsAt) : formatEventDate(event.startsAt)}</p></Link>)}</div> : <p className='mt-4 text-sm text-muted'>Aucun événement à venir.</p>}</section>
    </main>{currentUser.id === member.id ? <aside><MemberProfileForm displayName={member.displayName} avatarTone={member.avatarTone} hasAvatar={Boolean(member.avatarStorageKey)} /></aside> : null}</div>
  </div>
}

export default MemberPage
