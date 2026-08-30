import type { Metadata } from 'next'
import { and, asc, eq, gte, lt, or } from 'drizzle-orm'
import { Calendar, type CalendarEventView, type CalendarMember } from '@/components/calendar'
import { db } from '@/db/client'
import { events } from '@/db/schema/events'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Calendrier' }

type CalendarPageProps = { searchParams: Promise<{ month?: string | string[] }> }
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/
const parisDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

const toParisInput = (date: Date, allDay: boolean) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]))
  const day = `${parts.year}-${parts.month}-${parts.day}`
  return allDay ? day : `${day}T${parts.hour}:${parts.minute}`
}

const CalendarPage = async ({ searchParams }: CalendarPageProps) => {
  const currentUser = await requireCurrentUser()
  const params = await searchParams
  const requestedMonth = Array.isArray(params.month) ? params.month[0] : params.month
  const today = parisDateFormatter.format(new Date())
  const month = requestedMonth && monthPattern.test(requestedMonth) ? requestedMonth : today.slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)
  const rangeStart = new Date(Date.UTC(year, monthNumber - 1, 1) - 86400000)
  const rangeEnd = new Date(Date.UTC(year, monthNumber, 1) + 86400000)

  const [familyEvents, activeMembers] = await Promise.all([
    db.query.events.findMany({
      where: and(eq(events.familyId, currentUser.familyId), or(
        eq(events.repeatsYearly, true),
        and(gte(events.startsAt, rangeStart), lt(events.startsAt, rangeEnd)),
      )),
      orderBy: [asc(events.startsAt)],
      with: {
        creator: { columns: { displayName: true, avatarTone: true } },
        member: { columns: { displayName: true, avatarTone: true } },
      },
    }),
    db.select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(and(eq(users.familyId, currentUser.familyId), eq(users.isActive, true)))
      .orderBy(asc(users.displayName)),
  ])

  const eventViews: CalendarEventView[] = familyEvents.map((event) => ({
    id: event.id, creatorId: event.creatorId, creatorName: event.creator.displayName,
    memberId: event.memberId, memberName: event.member?.displayName ?? null,
    avatarTone: event.member?.avatarTone ?? event.creator.avatarTone, type: event.type,
    title: event.title, description: event.description, location: event.location,
    startsAt: toParisInput(event.startsAt, event.allDay),
    endsAt: event.endsAt ? toParisInput(event.endsAt, event.allDay) : null,
    allDay: event.allDay, repeatsYearly: event.repeatsYearly,
  }))
  const members: CalendarMember[] = activeMembers

  return (
    <div className='mx-auto max-w-275 px-4 pb-22.5 pt-4 min-[521px]:px-6 min-[521px]:pt-5 min-[821px]:px-13 min-[821px]:pb-17.5 min-[821px]:pt-6'>
      <Calendar currentUserId={currentUser.id} isAdmin={currentUser.role === 'admin'} month={month} today={today} events={eventViews} members={members} />
    </div>
  )
}

export default CalendarPage
