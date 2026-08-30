import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import {
  subscribeToRealtimeEvents,
  type RealtimeEvent,
} from '@/lib/realtime/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()
const encodeEvent = (event: RealtimeEvent) => encoder.encode(
  `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
)

export const GET = async (request: Request) => {
  const currentUser = await getCurrentUser()

  if (!currentUser) return new NextResponse(null, { status: 401 })
  if (currentUser.mustChangePassword) return new NextResponse(null, { status: 403 })

  let unsubscribe: () => void = () => undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      controller.enqueue(encoder.encode(': connected\n\n'))
      unsubscribe = subscribeToRealtimeEvents(currentUser.familyId, (event) => {
        controller.enqueue(encodeEvent(event))
      })
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 20_000)

      request.signal.addEventListener('abort', () => {
        unsubscribe()
        if (heartbeat) clearInterval(heartbeat)
        controller.close()
      }, { once: true })
    },
    cancel: () => {
      unsubscribe()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  })
}
