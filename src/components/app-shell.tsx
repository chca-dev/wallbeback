'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/avatar'
import { DesktopNavigation, MobileNavigation } from '@/components/app-navigation'
import { ThemeControls, type ThemeMode, type ThemePalette } from '@/components/theme-controls'

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('system')
  const [palette, setPalette] = useState<ThemePalette>('violet')

  return (
  <div data-mode={mode} data-palette={palette} className="theme-preview flex min-h-screen bg-background text-foreground">
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
          <strong className="block truncate text-xs">Famille Martin</strong>
          <span className="mt-0.5 block text-[10px] text-muted">6 membres</span>
        </div>
      </div>

      <DesktopNavigation />

      <div className="mt-auto">
        <div className="flex gap-2.5 rounded-[14px] bg-surface-pink p-[15px] text-[10px] leading-[1.6] text-muted transition-transform duration-200 hover:scale-[1.02]">
          <span aria-hidden="true" className="text-lg leading-[1.2] text-secondary">✦</span>
          <p>
            <strong className="mb-[3px] block text-foreground">Le petit mot du jour</strong>
            N’oubliez pas les photos de dimanche.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2">
          <Avatar name="Cha" tone="blue" />
          <span className="text-[13px] font-semibold">Cha</span>
          <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary-strong">Admin</span>
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
            mode={mode}
            palette={palette}
            onModeChange={setMode}
            onPaletteChange={setPalette}
          />
          <div className="flex items-center gap-2 rounded-[22px] py-[5px] pl-[5px] pr-2.5 transition-colors duration-200 hover:bg-surface-soft">
            <Avatar name="Cha" tone="blue" size="sm" />
            <span className="hidden text-xs font-bold min-[821px]:block">Cha</span>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>

    <MobileNavigation />
  </div>
  )
}
