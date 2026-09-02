'use client'

import { ArrowRight } from 'lucide-react'
import { useActionState } from 'react'
import { loginAction, type LoginActionState } from '@/app/auth-actions'
import { PasswordInput } from '@/components/password-input'

const initialState: LoginActionState = {}

export const LoginForm = () => {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="identity" className="mb-2 block text-xs font-bold text-muted">
          Identifiant ou email
        </label>
        <input
          id="identity"
          name="identity"
          type="text"
          autoComplete="username"
          autoFocus
          required
          aria-describedby={state.fieldErrors?.identity ? 'identity-error' : undefined}
          className="h-12 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none transition-colors placeholder:text-faint focus:border-primary"
          placeholder="ton-identifiant"
        />
        {state.fieldErrors?.identity ? (
          <p id="identity-error" className="mt-2 text-xs text-danger">
            {state.fieldErrors.identity[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-xs font-bold text-muted">
          Mot de passe
        </label>
        <PasswordInput
          id='password'
          name='password'
          autoComplete='current-password'
          required
          aria-describedby={state.fieldErrors?.password ? 'password-error' : undefined}
          className='h-12 w-full rounded-control border border-border bg-surface pl-4 pr-12 text-sm outline-none transition-colors placeholder:text-faint focus:border-primary'
          placeholder='••••••••••••'
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="mt-2 text-xs text-danger">
            {state.fieldErrors.password[0]}
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
        {pending ? 'Connexion…' : 'Entrer dans la maison'}
        {pending ? null : <ArrowRight size={17} />}
      </button>
    </form>
  )
}
