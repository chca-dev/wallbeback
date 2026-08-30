'use client'

import { Smile } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type EmojiPickerProps = {
  align?: 'left' | 'right'
  onSelect: (emoji: string) => void
}

const emojis = [
  '😀', '😂', '🥰', '😍', '😊', '🥳',
  '😎', '🤗', '🤔', '😅', '😭', '😴',
  '❤️', '💕', '👍', '👏', '🙏', '💪',
  '🎉', '🎂', '🎁', '☀️', '🌈', '✨',
]

export const EmojiPicker = ({ align = 'left', onSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={pickerRef} className='relative shrink-0'>
      <button
        type='button'
        aria-label='Ajouter un emoji'
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className='grid size-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-primary-soft hover:bg-primary-soft hover:text-primary-strong'
      >
        <Smile aria-hidden='true' size={17} />
      </button>
      {open ? (
        <div
          role='group'
          aria-label='Choisir un emoji'
          className={`animate-fade-up absolute bottom-11 z-40 grid w-58 grid-cols-6 gap-1 rounded-card border border-border bg-surface p-2.5 shadow-float ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type='button'
              aria-label={`Ajouter ${emoji}`}
              onClick={() => {
                onSelect(emoji)
                setOpen(false)
              }}
              className='grid size-8 place-items-center rounded-[9px] text-lg transition-[transform,background-color] hover:scale-110 hover:bg-surface-soft'
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
