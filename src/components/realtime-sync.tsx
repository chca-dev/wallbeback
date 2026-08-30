'use client'

import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const RealtimeSync = () => {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime')
    const refreshVisibleQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ['wall'] })
      void queryClient.invalidateQueries({ queryKey: ['photos'] })
      if (pathname === '/calendar' || pathname === '/wall') router.refresh()
    }

    eventSource.addEventListener('wall.updated', () => {
      if (pathname === '/wall') {
        window.dispatchEvent(new CustomEvent('wall-be-back:wall-updated'))
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['wall'] })
    })
    eventSource.addEventListener('photos.updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['photos'] })
    })
    eventSource.addEventListener('banner.updated', () => {
      if (pathname === '/wall') router.refresh()
    })
    eventSource.addEventListener('calendar.updated', () => {
      if (pathname === '/calendar') router.refresh()
    })
    eventSource.addEventListener('open', () => {
      refreshVisibleQueries()
    })
    document.addEventListener('visibilitychange', refreshVisibleQueries)

    return () => {
      eventSource.close()
      document.removeEventListener('visibilitychange', refreshVisibleQueries)
    }
  }, [pathname, queryClient, router])

  return null
}
