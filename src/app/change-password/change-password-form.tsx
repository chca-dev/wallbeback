'use client'

import { KeyRound } from 'lucide-react'
import { useActionState } from 'react'
import {
  changePasswordAction,
  type ChangePasswordActionState,
} from '@/app/auth-actions'

const initialState: ChangePasswordActionState = {}

export const ChangePasswordForm = () => {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="password" className="mb-2 block text-xs font-bold text-muted">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-describedby={state.fieldErrors?.password ? 'new-password-error' : undefined}
          className="h-12 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none transition-colors focus:border-primary"
        />
        {state.fieldErrors?.password ? (
          <p id="new-password-error" className="mt-2 text-xs text-danger">
            {state.fieldErrors.password[0]}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-faint">12 caractères minimum.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmation" className="mb-2 block text-xs font-bold text-muted">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={state.fieldErrors?.confirmation ? 'confirmation-error' : undefined}
          className="h-12 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none transition-colors focus:border-primary"
        />
        {state.fieldErrors?.confirmation ? (
          <p id="confirmation-error" className="mt-2 text-xs text-danger">
            {state.fieldErrors.confirmation[0]}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="rounded-control bg-secondary-soft px-4 py-3 text-xs font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary font-display text-sm font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-60"
      >
        <KeyRound size={17} />
        {pending ? 'Enregistrement…' : 'Choisir ce mot de passe'}
      </button>
    </form>
  )
}
