import 'server-only'

import { randomUUID } from 'node:crypto'

export type RealtimeEventType =
  | 'wall.updated'
  | 'photos.updated'
  | 'banner.updated'
  | 'calendar.updated'

export type RealtimeEvent = {
  id: string
  type: RealtimeEventType
  occurredAt: string
}

type RealtimeListener = (event: RealtimeEvent) => void
type RealtimeStore = Map<string, Set<RealtimeListener>>
type RealtimeGlobal = typeof globalThis & {
  wallBeBackRealtimeStore?: RealtimeStore
}

const realtimeGlobal = globalThis as RealtimeGlobal
const realtimeStore = realtimeGlobal.wallBeBackRealtimeStore
  ?? new Map<string, Set<RealtimeListener>>()
realtimeGlobal.wallBeBackRealtimeStore = realtimeStore

export const publishRealtimeEvent = (familyId: string, type: RealtimeEventType) => {
  const event: RealtimeEvent = {
    id: randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
  }

  realtimeStore.get(familyId)?.forEach((listener) => listener(event))
}

export const subscribeToRealtimeEvents = (familyId: string, listener: RealtimeListener) => {
  const listeners = realtimeStore.get(familyId) ?? new Set<RealtimeListener>()
  listeners.add(listener)
  realtimeStore.set(familyId, listeners)

  return () => {
    listeners.delete(listener)
    if (!listeners.size) realtimeStore.delete(familyId)
  }
}
