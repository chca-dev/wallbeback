'use client'

import { ChevronLeft, ChevronRight, Clock, Gift, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/avatar'
import { demoEvents } from '@/lib/demo-data'

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const CalendarDemo = () => {
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1))
  const [selectedDay, setSelectedDay] = useState(20)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(cursor)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const selectedEvents = demoEvents.filter((event) => event.date === dateKey(year, month, selectedDay))

  const upcomingEvents = useMemo(() => demoEvents.filter((event) => event.date >= '2026-08-20'), [])

  const changeMonth = (delta: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    setSelectedDay(1)
  }

  return (
    <>
      <div className="mb-3 flex items-baseline gap-2.5 min-[521px]:mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] min-[521px]:text-[28px]">Calendrier</h1>
        <span className="font-mono text-xs capitalize text-faint">{monthName}</span>
      </div>

      <div className="grid items-start gap-6 min-[821px]:grid-cols-[minmax(0,1fr)_300px] min-[1101px]:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[20px] border border-border bg-surface p-4 min-[521px]:p-6">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent" className="grid size-9 place-items-center rounded-[10px] text-muted transition-colors duration-200 hover:bg-surface-soft hover:text-foreground"><ChevronLeft size={20} /></button>
            <strong className="font-display text-lg font-semibold capitalize tracking-[-0.02em]">{monthName}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant" className="grid size-9 place-items-center rounded-[10px] text-muted transition-colors duration-200 hover:bg-surface-soft hover:text-foreground"><ChevronRight size={20} /></button>
          </div>
          <div className="mb-2 grid grid-cols-7">
            {weekdays.map((day, index) => <span key={`${day}-${index}`} className="text-center font-mono text-[10px] font-medium text-faint">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => day === null
              ? <span key={`empty-${index}`} className="aspect-square" />
              : (() => {
                const events = demoEvents.filter((event) => event.date === dateKey(year, month, day))
                const selected = selectedDay === day
                const today = year === 2026 && month === 7 && day === 20
                const hasBirthday = events.some((event) => event.type === 'birthday')
                const hasEvent = events.some((event) => event.type === 'event')

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    aria-pressed={selected}
                    className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-[transform,background-color,color] duration-150 min-[521px]:text-sm ${selected ? 'bg-primary font-bold text-white' : today ? 'bg-primary-soft font-bold text-primary-strong' : 'hover:bg-surface-soft'}`}
                  >
                    <span className="relative">
                      {day}
                      {today && !selected ? <span className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" /> : null}
                    </span>
                    <span className="flex h-1 gap-[3px]">
                      {hasBirthday ? <span className="size-1 rounded-full bg-secondary" /> : null}
                      {hasEvent ? <span className={`size-1 rounded-full ${selected ? 'bg-white' : 'bg-primary'}`} /> : null}
                    </span>
                  </button>
                )
              })())}
          </div>
          <div className="mt-4 flex gap-[18px] border-t border-border pt-4 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5"><i className="size-1 rounded-full bg-secondary" /> Anniversaire</span>
            <span className="flex items-center gap-1.5"><i className="size-1 rounded-full bg-primary" /> Événement</span>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-[18px] border border-border bg-surface p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-base font-semibold">{selectedDay} {monthName.split(' ')[0]}</h2>
              <span className="font-mono text-[10px] text-faint">
                {selectedEvents.length ? `${selectedEvents.length} événement${selectedEvents.length > 1 ? 's' : ''}` : 'Libre'}
              </span>
            </div>
            {selectedEvents.length ? (
              <div className="space-y-2.5">
                {selectedEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 rounded-xl bg-surface-soft p-3">
                    <Avatar name={event.person ?? event.title} tone={event.tone} />
                    <div className="min-w-0">
                      <strong className="block text-[13px] font-bold">{event.title}</strong>
                      <div className="mt-1 flex flex-wrap gap-2.5 text-[11px] font-medium text-muted">
                        {event.type === 'birthday' ? <span className="flex items-center gap-1"><Gift size={13} /> Anniversaire</span> : null}
                        {'time' in event && event.time ? <span className="flex items-center gap-1"><Clock size={13} /> {event.time}</span> : null}
                        {'location' in event && event.location ? <span className="flex items-center gap-1"><MapPin size={13} /> {event.location}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm font-semibold">Rien de prévu ce jour.</p>
                <span className="text-xs text-muted">Profitez-en pour vous.</span>
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-base font-semibold">À venir</h2>
            <div className="space-y-1.5">
              {upcomingEvents.map((event) => {
                const eventMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
                  .format(new Date(`${event.date}T12:00:00`))
                  .replace('.', '')
                  .toUpperCase()

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => { setCursor(new Date(`${event.date}T12:00:00`)); setSelectedDay(Number(event.date.slice(-2))); }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-[transform,background-color] duration-150 hover:translate-x-0.5 hover:bg-surface-soft"
                  >
                    <span className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl ${event.type === 'birthday' ? 'bg-secondary-soft text-secondary' : 'bg-primary-soft text-primary-strong'}`}>
                      <strong className="font-display text-lg font-bold leading-none">{Number(event.date.slice(-2))}</strong>
                      <span className="font-mono text-[8px]">{eventMonth}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] font-bold">{event.title}</strong>
                      <span className="text-[11px] text-muted">{event.type === 'birthday' ? 'Anniversaire' : 'time' in event && event.time ? event.time : 'Toute la journée'}</span>
                    </span>
                    {event.type === 'birthday' ? <Gift size={16} className="shrink-0 text-faint" /> : <Clock size={16} className="shrink-0 text-faint" />}
                  </button>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
