'use client'

import { Moon, Palette, Sun } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { saveThemeAction } from '@/app/(app)/theme-actions'
import type { ThemeMode, ThemePalette } from '@/db/schema/enums'

type ThemeControlsProps = {
  mode: ThemeMode
  palette: ThemePalette
}

const palettes: { id: ThemePalette; color: string; label: string }[] = [
  { id: 'violet', color: '#5b6cf9', label: 'Violet' },
  { id: 'terracotta', color: '#c86e51', label: 'Terracotta' },
  { id: 'ocean', color: '#287f98', label: 'Océan' },
]

export const ThemeControls = ({ mode: initialMode, palette: initialPalette }: ThemeControlsProps) => {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const [palette, setPalette] = useState(initialPalette)
  const [, startTransition] = useTransition()

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    document.documentElement.dataset.palette = palette
  }, [mode, palette])

  const applyTheme = (nextMode: ThemeMode, nextPalette: ThemePalette) => {
    setMode(nextMode)
    setPalette(nextPalette)
    setOpen(false)
    startTransition(() => { void saveThemeAction(nextMode, nextPalette) })
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Personnaliser l’apparence"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-surface-soft hover:text-primary-strong"
      >
        <Palette size={19} />
      </button>

      {open ? (
        <div className="animate-fade-up absolute right-0 top-12 z-50 w-64 rounded-card border border-border bg-surface p-4 shadow-float">
          <p className="mb-3 font-display text-sm font-semibold">Apparence</p>
          <div className="grid grid-cols-3 gap-2" aria-label="Mode d’affichage">
            {(['light', 'dark', 'system'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                onClick={() => applyTheme(item, palette)}
                className={`flex flex-col items-center gap-1 rounded-control border px-2 py-2 text-[10px] font-semibold transition ${
                  mode === item ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border text-muted hover:bg-surface-soft'
                }`}
              >
                {item === 'light' ? <Sun size={15} /> : item === 'dark' ? <Moon size={15} /> : <span className="text-sm">A</span>}
                {item === 'light' ? 'Clair' : item === 'dark' ? 'Sombre' : 'Auto'}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">Couleur</p>
          <div className="flex gap-2">
            {palettes.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={palette === item.id}
                onClick={() => applyTheme(mode, item.id)}
                className={`size-9 rounded-full border-4 transition hover:scale-105 ${palette === item.id ? 'border-foreground' : 'border-surface'}`}
                style={{ backgroundColor: item.color }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
