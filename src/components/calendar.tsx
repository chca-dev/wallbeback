'use client'

import { ChevronLeft, ChevronRight, Clock, Gift, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEventAction, deleteEventAction, updateEventAction, type CalendarActionState } from '@/app/(app)/calendar/actions'
import { Avatar } from '@/components/avatar'
import type { CalendarEventType } from '@/db/schema/enums'
import type { AvatarTone } from '@/lib/avatar'

export type CalendarEventView = {
  id: string
  creatorId: string
  creatorName: string
  memberId: string | null
  memberName: string | null
  avatarTone: string
  type: CalendarEventType
  title: string
  description: string | null
  location: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  repeatsYearly: boolean
}

export type CalendarMember = { id: string, displayName: string }
type CalendarProps = { currentUserId: string, isAdmin: boolean, month: string, today: string, events: CalendarEventView[], members: CalendarMember[] }

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const initialState: CalendarActionState = {}
const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone) ? tone as AvatarTone : 'blue'

const EventFields = ({ event, members, defaultDate }: { event?: CalendarEventView, members: CalendarMember[], defaultDate?: string }) => (
  <div className='grid gap-3'>
    {event ? <input type='hidden' name='eventId' value={event.id} /> : null}
    <label className='grid gap-1 text-xs font-semibold'>Titre<input required maxLength={160} name='title' defaultValue={event?.title} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal' /></label>
    <div className='grid grid-cols-2 gap-3'>
      <label className='grid gap-1 text-xs font-semibold'>Type<select name='type' defaultValue={event?.type ?? 'event'} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal'><option value='event'>Événement</option><option value='birthday'>Anniversaire</option></select></label>
      <label className='grid gap-1 text-xs font-semibold'>Membre<select name='memberId' defaultValue={event?.memberId ?? ''} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal'><option value=''>Aucun</option>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label>
    </div>
    <label className='grid gap-1 text-xs font-semibold'>Début<input required name='startsAt' type={event?.allDay ? 'date' : 'datetime-local'} defaultValue={event?.startsAt ?? `${defaultDate}T12:00`} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal' /></label>
    <label className='grid gap-1 text-xs font-semibold'>Fin, facultative<input name='endsAt' type={event?.allDay ? 'date' : 'datetime-local'} defaultValue={event?.endsAt ?? ''} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal' /></label>
    <label className='grid gap-1 text-xs font-semibold'>Lieu<input maxLength={255} name='location' defaultValue={event?.location ?? ''} className='rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal' /></label>
    <label className='grid gap-1 text-xs font-semibold'>Description<textarea maxLength={5000} name='description' defaultValue={event?.description ?? ''} rows={2} className='resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm font-normal' /></label>
    <div className='flex flex-wrap gap-4 text-xs font-semibold'><label className='flex items-center gap-2'><input name='allDay' type='checkbox' defaultChecked={event?.allDay} /> Toute la journée</label><label className='flex items-center gap-2'><input name='repeatsYearly' type='checkbox' defaultChecked={event?.repeatsYearly} /> Répéter chaque année</label></div>
  </div>
)

const EventEditor = ({ event, members, onClose }: { event: CalendarEventView, members: CalendarMember[], onClose: () => void }) => {
  const [state, action, pending] = useActionState(updateEventAction, initialState)
  return <form action={action} className='mt-3 rounded-xl border border-border bg-surface p-3'><EventFields event={event} members={members} />{state.error ? <p className='mt-2 text-xs text-danger'>{state.error}</p> : null}<div className='mt-3 flex justify-end gap-2'><button type='button' onClick={onClose} className='rounded-lg px-3 py-2 text-xs font-semibold text-muted'>Annuler</button><button disabled={pending} className='rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50'>{pending ? 'Enregistrement…' : 'Enregistrer'}</button></div></form>
}

export const Calendar = ({ currentUserId, isAdmin, month, today, events, members }: CalendarProps) => {
  const router = useRouter()
  const [year, monthNumber] = month.split('-').map(Number)
  const [selectedDay, setSelectedDay] = useState(today.startsWith(month) ? Number(today.slice(-2)) : 1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const createAndClose = async (previousState: CalendarActionState, formData: FormData) => {
    const result = await createEventAction(previousState, formData)

    if (result.success) {
      setShowCreate(false)
    }

    return result
  }
  const [createState, createAction, creating] = useActionState(createAndClose, initialState)
  const [deleteState, deleteAction, deleting] = useActionState(deleteEventAction, initialState)
  const cursor = new Date(year, monthNumber - 1, 1)
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(cursor)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const firstWeekday = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const eventDay = (event: CalendarEventView) => Number(event.startsAt.slice(8, 10))
  const monthEvents = useMemo(() => events.filter((event) => event.repeatsYearly ? Number(event.startsAt.slice(5, 7)) === monthNumber : event.startsAt.startsWith(month)), [events, month, monthNumber])
  const selectedEvents = monthEvents.filter((event) => eventDay(event) === selectedDay)
  const upcomingEvents = monthEvents.filter((event) => eventDay(event) >= selectedDay).slice(0, 8)
  const selectedDate = `${month}-${String(selectedDay).padStart(2, '0')}`

  const changeMonth = (delta: number) => {
    const next = new Date(year, monthNumber - 1 + delta, 1)
    router.push(`/calendar?month=${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return <>
    <div className='mb-3 flex items-baseline justify-between gap-2.5 min-[521px]:mb-4'><div className='flex items-baseline gap-2.5'><h1 className='font-display text-2xl font-semibold tracking-[-0.03em] min-[521px]:text-[28px]'>Calendrier</h1><span className='font-mono text-xs capitalize text-faint'>{monthName}</span></div><button type='button' onClick={() => setShowCreate((value) => !value)} className='flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white'><Plus size={15} /> Ajouter</button></div>
    {showCreate ? <form action={createAction} className='mb-4 rounded-card border border-border bg-surface p-4'><EventFields members={members} defaultDate={selectedDate} />{createState.error ? <p className='mt-2 text-xs text-danger'>{createState.error}</p> : null}{createState.message ? <p className='mt-2 text-xs text-primary'>{createState.message}</p> : null}<div className='mt-3 flex justify-end'><button disabled={creating} className='rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50'>{creating ? 'Ajout…' : 'Ajouter l’événement'}</button></div></form> : null}
    <div className='grid items-start gap-6 min-[821px]:grid-cols-[minmax(0,1fr)_300px] min-[1101px]:grid-cols-[minmax(0,1fr)_340px]'>
      <section className='rounded-[20px] border border-border bg-surface p-4 min-[521px]:p-6'>
        <div className='mb-5 flex items-center justify-between'><button type='button' onClick={() => changeMonth(-1)} aria-label='Mois précédent' className='grid size-9 place-items-center rounded-[10px] text-muted hover:bg-surface-soft'><ChevronLeft size={20} /></button><strong className='font-display text-lg font-semibold capitalize'>{monthName}</strong><button type='button' onClick={() => changeMonth(1)} aria-label='Mois suivant' className='grid size-9 place-items-center rounded-[10px] text-muted hover:bg-surface-soft'><ChevronRight size={20} /></button></div>
        <div className='mb-2 grid grid-cols-7'>{weekdays.map((day, index) => <span key={`${day}-${index}`} className='text-center font-mono text-[10px] font-medium text-faint'>{day}</span>)}</div>
        <div className='grid grid-cols-7 gap-1'>{cells.map((day, index) => day === null ? <span key={`empty-${index}`} className='aspect-square' /> : (() => { const dayEvents = monthEvents.filter((event) => eventDay(event) === day); const selected = selectedDay === day; const isToday = today === `${month}-${String(day).padStart(2, '0')}`; return <button key={day} type='button' onClick={() => setSelectedDay(day)} aria-pressed={selected} className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium min-[521px]:text-sm ${selected ? 'bg-primary font-bold text-white' : isToday ? 'bg-primary-soft font-bold text-primary-strong' : 'hover:bg-surface-soft'}`}><span>{day}</span><span className='flex h-1 gap-0.75'>{dayEvents.some((event) => event.type === 'birthday') ? <span className='size-1 rounded-full bg-secondary' /> : null}{dayEvents.some((event) => event.type === 'event') ? <span className={`size-1 rounded-full ${selected ? 'bg-white' : 'bg-primary'}`} /> : null}</span></button> })())}</div>
        <div className='mt-4 flex gap-4.5 border-t border-border pt-4 text-[11px] font-semibold text-muted'><span className='flex items-center gap-1.5'><i className='size-1 rounded-full bg-secondary' /> Anniversaire</span><span className='flex items-center gap-1.5'><i className='size-1 rounded-full bg-primary' /> Événement</span></div>
      </section>
      <aside className='flex flex-col gap-4'>
        <section className='rounded-card border border-border bg-surface p-5'><div className='mb-4 flex items-baseline justify-between'><h2 className='font-display text-base font-semibold'>{selectedDay} {monthName.split(' ')[0]}</h2><span className='font-mono text-[10px] text-faint'>{selectedEvents.length ? `${selectedEvents.length} événement${selectedEvents.length > 1 ? 's' : ''}` : 'Libre'}</span></div>{selectedEvents.length ? <div className='space-y-2.5'>{selectedEvents.map((event) => { const canManage = isAdmin || event.creatorId === currentUserId; return <div key={event.id} className='rounded-xl bg-surface-soft p-3'><div className='flex items-start gap-3'><Avatar name={event.memberName ?? event.creatorName} tone={getAvatarTone(event.avatarTone)} /><div className='min-w-0 flex-1'><strong className='block text-[13px] font-bold'>{event.title}</strong><div className='mt-1 flex flex-wrap gap-2.5 text-[11px] font-medium text-muted'>{event.type === 'birthday' ? <span className='flex items-center gap-1'><Gift size={13} /> Anniversaire</span> : <span className='flex items-center gap-1'><Clock size={13} /> {event.allDay ? 'Toute la journée' : event.startsAt.slice(11)}</span>}{event.location ? <span className='flex items-center gap-1'><MapPin size={13} /> {event.location}</span> : null}</div></div>{canManage ? <div className='flex gap-1'><button type='button' onClick={() => setEditingId(editingId === event.id ? null : event.id)} aria-label='Modifier' className='p-1.5 text-muted'><Pencil size={14} /></button><form action={deleteAction} onSubmit={(formEvent) => { if (!window.confirm('Supprimer cet événement ?')) formEvent.preventDefault() }}><input type='hidden' name='eventId' value={event.id} /><button disabled={deleting} aria-label='Supprimer' className='p-1.5 text-muted'><Trash2 size={14} /></button></form></div> : null}</div>{editingId === event.id ? <EventEditor event={event} members={members} onClose={() => setEditingId(null)} /> : null}</div>})}{deleteState.error ? <p className='text-xs text-danger'>{deleteState.error}</p> : null}</div> : <div className='py-4 text-center'><p className='text-sm font-semibold'>Rien de prévu ce jour.</p><span className='text-xs text-muted'>Profitez-en pour vous.</span></div>}</section>
        <section className='rounded-card border border-border bg-surface p-5'><h2 className='mb-4 font-display text-base font-semibold'>À venir ce mois-ci</h2><div className='space-y-1.5'>{upcomingEvents.length ? upcomingEvents.map((event) => <button key={event.id} type='button' onClick={() => setSelectedDay(eventDay(event))} className='flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-surface-soft'><span className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl ${event.type === 'birthday' ? 'bg-secondary-soft text-secondary' : 'bg-primary-soft text-primary-strong'}`}><strong className='font-display text-lg font-bold leading-none'>{eventDay(event)}</strong><span className='font-mono text-[8px]'>{monthName.slice(0, 3).toUpperCase()}</span></span><span className='min-w-0 flex-1'><strong className='block truncate text-[13px] font-bold'>{event.title}</strong><span className='text-[11px] text-muted'>{event.type === 'birthday' ? 'Anniversaire' : event.allDay ? 'Toute la journée' : event.startsAt.slice(11)}</span></span></button>) : <p className='text-xs text-muted'>Aucun autre événement ce mois-ci.</p>}</div></section>
      </aside>
    </div>
  </>
}
