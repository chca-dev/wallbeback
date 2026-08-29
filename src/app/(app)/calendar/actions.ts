'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import { calendarEventTypeValues } from '@/db/schema/enums'
import { events } from '@/db/schema/events'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'

export type CalendarActionState = {
  success?: string
  error?: string
}

const eventSchema = z.object({
  eventId: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Ajoute un titre.').max(160, 'Le titre est trop long.'),
  type: z.enum(calendarEventTypeValues),
  memberId: z.preprocess((value) => value === '' ? null : value, z.string().uuid().nullable()),
  description: z.string().trim().max(5000, 'La description est trop longue.'),
  location: z.string().trim().max(255, 'Le lieu est trop long.'),
  startsAt: z.string().min(1, 'Choisis une date.'),
  endsAt: z.string(),
  allDay: z.boolean(),
  repeatsYearly: z.boolean(),
})

const datePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const parseParisDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value)
  if (!match) return null

  const [, year, month, day, hour = '00', minute = '00'] = match
  const expectedUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  let candidate = expectedUtc

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      datePartsFormatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]),
    )
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    )
    candidate += expectedUtc - representedUtc
  }

  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? null : date
}

const readEventForm = (formData: FormData) => eventSchema.safeParse({
  eventId: formData.get('eventId') || undefined,
  title: formData.get('title'),
  type: formData.get('type'),
  memberId: formData.get('memberId'),
  description: formData.get('description') ?? '',
  location: formData.get('location') ?? '',
  startsAt: formData.get('startsAt'),
  endsAt: formData.get('endsAt') ?? '',
  allDay: formData.get('allDay') === 'on',
  repeatsYearly: formData.get('repeatsYearly') === 'on',
})

const validateMember = async (memberId: string | null, familyId: string) => {
  if (!memberId) return true
  const member = await db.query.users.findFirst({
    where: and(eq(users.id, memberId), eq(users.familyId, familyId), eq(users.isActive, true)),
    columns: { id: true },
  })
  return Boolean(member)
}

const getManagedEvent = async (eventId: string, familyId: string) => db.query.events.findFirst({
  where: and(eq(events.id, eventId), eq(events.familyId, familyId)),
})

export const createEventAction = async (
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> => {
  const currentUser = await requireCurrentUser()
  const parsed = readEventForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Événement invalide.' }

  const startsAt = parseParisDate(parsed.data.startsAt)
  const endsAt = parsed.data.endsAt ? parseParisDate(parsed.data.endsAt) : null
  if (!startsAt || (parsed.data.endsAt && !endsAt)) return { error: 'La date saisie est invalide.' }
  if (endsAt && endsAt < startsAt) return { error: 'La fin doit être postérieure au début.' }
  if (parsed.data.type === 'birthday' && !parsed.data.memberId) return { error: 'Choisis le membre concerné par cet anniversaire.' }
  if (!await validateMember(parsed.data.memberId, currentUser.familyId)) return { error: 'Ce membre est introuvable.' }

  await db.insert(events).values({
    familyId: currentUser.familyId,
    creatorId: currentUser.id,
    memberId: parsed.data.memberId,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description || null,
    location: parsed.data.location || null,
    startsAt,
    endsAt,
    allDay: parsed.data.allDay,
    repeatsYearly: parsed.data.type === 'birthday' || parsed.data.repeatsYearly,
  })

  revalidatePath('/calendar')
  return { success: 'Événement ajouté.' }
}

export const updateEventAction = async (
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> => {
  const currentUser = await requireCurrentUser()
  const parsed = readEventForm(formData)
  if (!parsed.success || !parsed.data.eventId) return { error: 'Événement invalide.' }

  const target = await getManagedEvent(parsed.data.eventId, currentUser.familyId)
  if (!target) return { error: 'Cet événement est introuvable.' }
  if (currentUser.role !== 'admin' && target.creatorId !== currentUser.id) return { error: 'Tu ne peux pas modifier cet événement.' }

  const startsAt = parseParisDate(parsed.data.startsAt)
  const endsAt = parsed.data.endsAt ? parseParisDate(parsed.data.endsAt) : null
  if (!startsAt || (parsed.data.endsAt && !endsAt)) return { error: 'La date saisie est invalide.' }
  if (endsAt && endsAt < startsAt) return { error: 'La fin doit être postérieure au début.' }
  if (parsed.data.type === 'birthday' && !parsed.data.memberId) return { error: 'Choisis le membre concerné.' }
  if (!await validateMember(parsed.data.memberId, currentUser.familyId)) return { error: 'Ce membre est introuvable.' }

  await db.update(events).set({
    memberId: parsed.data.memberId,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description || null,
    location: parsed.data.location || null,
    startsAt,
    endsAt,
    allDay: parsed.data.allDay,
    repeatsYearly: parsed.data.type === 'birthday' || parsed.data.repeatsYearly,
  }).where(and(eq(events.id, target.id), eq(events.familyId, currentUser.familyId)))

  revalidatePath('/calendar')
  return { success: 'Événement modifié.' }
}

export const deleteEventAction = async (
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> => {
  const currentUser = await requireCurrentUser()
  const parsed = z.string().uuid().safeParse(formData.get('eventId'))
  if (!parsed.success) return { error: 'Événement invalide.' }

  const target = await getManagedEvent(parsed.data, currentUser.familyId)
  if (!target) return { error: 'Cet événement est introuvable.' }
  if (currentUser.role !== 'admin' && target.creatorId !== currentUser.id) return { error: 'Tu ne peux pas supprimer cet événement.' }

  await db.delete(events).where(and(eq(events.id, target.id), eq(events.familyId, currentUser.familyId)))
  revalidatePath('/calendar')
  return { success: 'Événement supprimé.' }
}
