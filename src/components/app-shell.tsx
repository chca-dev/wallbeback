'use client'

import { LogOut, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/auth-actions'
import { Avatar } from '@/components/avatar'
import { DesktopNavigation, MobileNavigation } from '@/components/app-navigation'
import { ThemeControls } from '@/components/theme-controls'
import type { ThemeMode, ThemePalette, UserRole } from '@/db/schema/enums'
import type { AvatarTone } from '@/lib/avatar'

type AppShellUser = {
  id: string
  displayName: string
  familyName: string
  role: UserRole
  avatarTone: AvatarTone
  hasAvatar: boolean
  themeMode: ThemeMode
  themePalette: ThemePalette
}

type AppShellProps = {
  children: React.ReactNode
  user: AppShellUser
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  adult: 'Adulte',
  child: 'Enfant',
}

export const AppShell = ({ children, user }: AppShellProps) => {
  const pathname = usePathname()
  return (
  <div className="flex min-h-screen bg-background text-foreground">
    <aside className='sticky top-0 hidden h-dvh w-53.5 shrink-0 self-start flex-col overflow-hidden border-r border-border bg-surface px-4 pb-6 pt-7.5 min-[821px]:flex min-[1101px]:w-62 min-[1101px]:px-5.5'>
      <div className='scrollbar-none min-h-0 flex-1 overflow-y-auto pb-6 [&::-webkit-scrollbar]:hidden'>
        <div className='group flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.04em]'>
          <span className='grid size-7.5 rotate-[-7deg] place-items-center rounded-[10px] bg-primary text-white transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.08]'>
            <Sparkles className='rotate-[7deg] transition-transform duration-300 group-hover:rotate-0' size={17} />
          </span>
          Wall Be Back
        </div>

        <div className='mt-11 flex items-center gap-2.5 rounded-[14px] border border-border bg-surface p-2.5'>
          <span className='grid size-7.75 place-items-center rounded-[9px] bg-primary text-[10px] font-extrabold text-white'>FM</span>
          <div className='min-w-0 flex-1'>
            <strong className='block truncate text-xs'>{user.familyName}</strong>
            <span className='mt-0.5 block text-[10px] text-muted'>Espace privé</span>
          </div>
        </div>

        <DesktopNavigation isAdmin={user.role === 'admin'} />
      </div>

      <div className='shrink-0 border-t border-border bg-surface pt-4'>
        <div className='flex gap-2.5 rounded-[14px] bg-surface-pink p-3.75 text-[10px] leading-[1.6] text-muted transition-transform duration-200 hover:scale-[1.02]'>
          <span aria-hidden='true' className='text-lg leading-[1.2] text-secondary'>✦</span>
          <p>
            <strong className='mb-0.75 block text-foreground'>Le petit mot du jour</strong>
            N’oubliez pas les photos de dimanche.
          </p>
        </div>
        <div className='mt-5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2'>
          <Avatar name={user.displayName} tone={user.avatarTone} imageUrl={user.hasAvatar ? `/avatar/${user.id}` : null} />
          <span className='min-w-0 flex-1 truncate text-[13px] font-semibold'>{user.displayName}</span>
          <span className='rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary-strong'>
            {roleLabels[user.role]}
          </span>
          <form action={logoutAction}>
            <button
              type='submit'
              aria-label='Se déconnecter'
              className='grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-danger'
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="flex h-14 items-center justify-between border-b border-border px-5 min-[821px]:h-16.5 min-[821px]:px-8 min-[1101px]:px-13">
        {pathname === '/wall' ? <p className='font-display text-lg font-semibold tracking-tight min-[821px]:text-[22px]'>Les nouvelles du <span className='text-primary'>front.</span></p> : <div className="group flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.04em] min-[821px]:hidden">
          <span className="grid size-7.5 rotate-[-7deg] place-items-center rounded-[10px] bg-primary text-white transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.08]">
            <Sparkles className="rotate-[7deg] transition-transform duration-300 group-hover:rotate-0" size={16} />
          </span>
          Wall Be Back
        </div>}
        <div className="flex items-center gap-5.75">
          <ThemeControls
            mode={user.themeMode}
            palette={user.themePalette}
          />
          <form action={logoutAction} className="min-[821px]:hidden">
            <button
              type="submit"
              aria-label="Se déconnecter"
              className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-danger"
            >
              <LogOut size={17} />
            </button>
          </form>
          <div className="flex items-center gap-2 rounded-[22px] py-1.25 pl-1.25 pr-2.5 transition-colors duration-200 hover:bg-surface-soft">
            <Avatar name={user.displayName} tone={user.avatarTone} imageUrl={user.hasAvatar ? `/avatar/${user.id}` : null} size="sm" />
            <span className="hidden max-w-32 truncate text-xs font-bold min-[821px]:block">{user.displayName}</span>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>

    <MobileNavigation isAdmin={user.role === 'admin'} />
  </div>
  )
}
