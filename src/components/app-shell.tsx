'use client'

import { LogOut, Sparkles } from 'lucide-react'
import { logoutAction } from '@/app/auth-actions'
import { Avatar } from '@/components/avatar'
import { DesktopNavigation, MobileNavigation } from '@/components/app-navigation'
import { ThemeControls } from '@/components/theme-controls'
import type { ThemeMode, ThemePalette, UserRole } from '@/db/schema/enums'
import type { AvatarTone } from '@/lib/demo-data'

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
  return (
  <div className="flex min-h-screen bg-background text-foreground">
    <aside className="hidden w-[214px] shrink-0 flex-col border-r border-border bg-surface px-4 pb-6 pt-[30px] min-[821px]:flex min-[1101px]:w-[248px] min-[1101px]:px-[22px]">
      <div className="group flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.04em]">
        <span className="grid size-[30px] -rotate-[7deg] place-items-center rounded-[10px] bg-primary text-white transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.08]">
          <Sparkles className="rotate-[7deg] transition-transform duration-300 group-hover:rotate-0" size={17} />
        </span>
        Wall Be Back
      </div>

      <div className="mt-11 flex items-center gap-2.5 rounded-[14px] border border-border bg-surface p-2.5">
        <span className="grid size-[31px] place-items-center rounded-[9px] bg-primary text-[10px] font-extrabold text-white">FM</span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-xs">{user.familyName}</strong>
          <span className="mt-0.5 block text-[10px] text-muted">Espace privé</span>
        </div>
      </div>

      <DesktopNavigation isAdmin={user.role === 'admin'} />

      <div className="mt-auto">
        <div className="flex gap-2.5 rounded-[14px] bg-surface-pink p-[15px] text-[10px] leading-[1.6] text-muted transition-transform duration-200 hover:scale-[1.02]">
          <span aria-hidden="true" className="text-lg leading-[1.2] text-secondary">✦</span>
          <p>
            <strong className="mb-[3px] block text-foreground">Le petit mot du jour</strong>
            N’oubliez pas les photos de dimanche.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2">
          <Avatar name={user.displayName} tone={user.avatarTone} imageUrl={user.hasAvatar ? `/avatar/${user.id}` : null} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{user.displayName}</span>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary-strong">
            {roleLabels[user.role]}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Se déconnecter"
              className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-danger"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="flex h-16 items-center justify-between border-b border-border px-5 min-[821px]:h-[76px] min-[821px]:justify-end min-[821px]:px-8 min-[1101px]:px-[52px]">
        <div className="group flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.04em] min-[821px]:hidden">
          <span className="grid size-[30px] -rotate-[7deg] place-items-center rounded-[10px] bg-primary text-white transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.08]">
            <Sparkles className="rotate-[7deg] transition-transform duration-300 group-hover:rotate-0" size={16} />
          </span>
          Wall Be Back
        </div>
        <div className="flex items-center gap-[23px]">
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
          <div className="flex items-center gap-2 rounded-[22px] py-[5px] pl-[5px] pr-2.5 transition-colors duration-200 hover:bg-surface-soft">
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
