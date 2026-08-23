'use client'

import { CalendarDays, Camera, Compass, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/wall', label: 'Wall', icon: Compass },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { href: '/family', label: 'Famille', icon: UsersRound },
]

export const DesktopNavigation = () => {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigation principale" className="mt-[38px]">
      <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">La maison</p>
      <div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`my-[3px] flex items-center gap-[13px] rounded-control p-3 text-[13px] font-semibold transition ${
                active ? 'bg-primary-soft text-primary-strong' : 'text-muted hover:translate-x-0.5 hover:bg-surface-soft hover:text-foreground'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
              {active ? <span className="ml-auto size-[7px] rounded-full bg-secondary" /> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export const MobileNavigation = () => {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 flex h-[70px] items-center justify-around border-t border-border bg-surface/95 px-[14px] pb-2.5 pt-2 backdrop-blur-md min-[821px]:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-[54px] flex-col items-center gap-[3px] rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${active ? 'text-primary-strong' : 'text-muted'}`}
          >
            <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
