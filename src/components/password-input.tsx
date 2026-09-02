'use client'

import { Eye, EyeOff } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useState } from 'react'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>

export const PasswordInput = ({ className = '', ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false)
  const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'

  return (
    <div className='relative'>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={className}
      />
      <button
        type='button'
        aria-label={label}
        aria-pressed={visible}
        title={label}
        onClick={() => setVisible((current) => !current)}
        className='absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
      >
        {visible
          ? <EyeOff aria-hidden='true' size={17} />
          : <Eye aria-hidden='true' size={17} />}
      </button>
    </div>
  )
}
