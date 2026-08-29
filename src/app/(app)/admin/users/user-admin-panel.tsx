'use client'

import { KeyRound, Power, Save, UserPlus } from 'lucide-react'
import { useActionState } from 'react'
import { Avatar } from '@/components/avatar'
import type { UserRole } from '@/db/schema/enums'
import type { AvatarTone } from '@/lib/avatar'
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  updateUserAction,
  type UserActionState,
} from './actions'

type ManagedUser = {
  id: string
  displayName: string
  username: string
  email: string
  role: UserRole
  avatarTone: string
  isActive: boolean
  mustChangePassword: boolean
}

type UserAdminPanelProps = {
  currentUserId: string
  users: ManagedUser[]
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  adult: 'Adulte',
  child: 'Enfant',
}

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']
const initialState: UserActionState = {}
const inputClassName = 'w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary'
const labelClassName = 'grid gap-1.5 text-xs font-semibold text-muted'

const getAvatarTone = (tone: string): AvatarTone => (
  avatarTones.includes(tone as AvatarTone) ? tone as AvatarTone : 'blue'
)

const Feedback = ({ state }: { state: UserActionState }) => {
  const message = state.error ?? state.success

  if (!message) {
    return null
  }

  return (
    <p
      role="status"
      className={`rounded-control px-3 py-2 text-xs font-semibold ${state.error ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary-strong'}`}
    >
      {message}
    </p>
  )
}

const FieldError = ({ state, name }: { state: UserActionState, name: keyof NonNullable<UserActionState['fieldErrors']> }) => {
  const message = state.fieldErrors?.[name]?.[0]
  return message ? <span className="text-[11px] font-medium text-danger">{message}</span> : null
}

const RoleSelect = ({ defaultValue }: { defaultValue?: UserRole }) => (
  <label className={labelClassName}>
    Type de profil
    <select name="role" defaultValue={defaultValue ?? 'adult'} className={inputClassName}>
      <option value="admin">Admin</option>
      <option value="adult">Adulte</option>
      <option value="child">Enfant</option>
    </select>
  </label>
)

const ToneSelect = ({ defaultValue }: { defaultValue?: string }) => (
  <label className={labelClassName}>
    Couleur de l’avatar
    <select name="avatarTone" defaultValue={getAvatarTone(defaultValue ?? 'blue')} className={inputClassName}>
      <option value="blue">Bleu</option>
      <option value="pink">Rose</option>
      <option value="cyan">Cyan</option>
      <option value="lavender">Lavande</option>
    </select>
  </label>
)

const CreateUserForm = () => {
  const [state, formAction, pending] = useActionState(createUserAction, initialState)

  return (
    <section className="rounded-card border border-border bg-surface p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-strong">
          <UserPlus size={19} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Ajouter un profil</h2>
          <p className="text-xs text-muted">Le mot de passe choisi sera temporaire.</p>
        </div>
      </div>
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          Nom affiché
          <input name="displayName" required maxLength={120} className={inputClassName} />
          <FieldError state={state} name="displayName" />
        </label>
        <label className={labelClassName}>
          Identifiant
          <input name="username" required minLength={3} maxLength={64} autoCapitalize="none" className={inputClassName} />
          <FieldError state={state} name="username" />
        </label>
        <label className={labelClassName}>
          Email
          <input name="email" type="email" required maxLength={320} autoCapitalize="none" className={inputClassName} />
          <FieldError state={state} name="email" />
        </label>
        <label className={labelClassName}>
          Mot de passe temporaire
          <input name="temporaryPassword" type="password" required minLength={12} maxLength={128} className={inputClassName} />
          <FieldError state={state} name="temporaryPassword" />
        </label>
        <RoleSelect />
        <ToneSelect />
        <div className="flex flex-col-reverse gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
          <Feedback state={state} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <UserPlus size={16} />
            {pending ? 'Création…' : 'Créer le profil'}
          </button>
        </div>
      </form>
    </section>
  )
}

const UserCard = ({ user, isCurrentUser }: { user: ManagedUser, isCurrentUser: boolean }) => {
  const [updateState, updateAction, updatePending] = useActionState(updateUserAction, initialState)
  const [statusState, statusAction, statusPending] = useActionState(toggleUserStatusAction, initialState)
  const [passwordState, passwordAction, passwordPending] = useActionState(resetUserPasswordAction, initialState)

  return (
    <article className={`rounded-card border bg-surface p-5 ${user.isActive ? 'border-border' : 'border-border opacity-65'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={user.displayName} tone={getAvatarTone(user.avatarTone)} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-base font-semibold">{user.displayName}</h2>
            {isCurrentUser ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold text-primary-strong">Toi</span> : null}
            {!user.isActive ? <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">Désactivé</span> : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">@{user.username} · {roleLabels[user.role]}</p>
          <p className="mt-0.5 truncate text-[11px] text-faint">{user.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
        {user.mustChangePassword ? <span className="rounded-full bg-surface-pink px-2.5 py-1 text-muted">Mot de passe à changer</span> : null}
      </div>

      <details className="group mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer list-none text-xs font-bold text-primary-strong">Modifier le profil</summary>
        <form action={updateAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="userId" value={user.id} />
          <label className={labelClassName}>
            Nom affiché
            <input name="displayName" required defaultValue={user.displayName} maxLength={120} className={inputClassName} />
            <FieldError state={updateState} name="displayName" />
          </label>
          <label className={labelClassName}>
            Identifiant
            <input name="username" required defaultValue={user.username} minLength={3} maxLength={64} className={inputClassName} />
            <FieldError state={updateState} name="username" />
          </label>
          <label className={`${labelClassName} sm:col-span-2`}>
            Email
            <input name="email" type="email" required defaultValue={user.email} maxLength={320} className={inputClassName} />
            <FieldError state={updateState} name="email" />
          </label>
          <RoleSelect defaultValue={user.role} />
          <ToneSelect defaultValue={user.avatarTone} />
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <Feedback state={updateState} />
            <button type="submit" disabled={updatePending} className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
              <Save size={14} /> {updatePending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </details>

      {!isCurrentUser ? (
        <details className="group mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer list-none text-xs font-bold text-primary-strong">Définir un mot de passe temporaire</summary>
          <form action={passwordAction} className="mt-4 grid gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <label className={labelClassName}>
              Nouveau mot de passe temporaire
              <input name="temporaryPassword" type="password" required minLength={12} maxLength={128} className={inputClassName} />
              <FieldError state={passwordState} name="temporaryPassword" />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Feedback state={passwordState} />
              <button type="submit" disabled={passwordPending} className="inline-flex items-center justify-center gap-2 rounded-control border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-60">
                <KeyRound size={14} /> {passwordPending ? 'Réinitialisation…' : 'Réinitialiser'}
              </button>
            </div>
          </form>
        </details>
      ) : null}

      <form action={statusAction} className="mt-4 border-t border-border pt-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Feedback state={statusState} />
          <button
            type="submit"
            disabled={statusPending || isCurrentUser}
            className={`inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${user.isActive ? 'border border-danger/30 text-danger' : 'bg-primary-soft text-primary-strong'}`}
          >
            <Power size={14} />
            {statusPending ? 'Mise à jour…' : user.isActive ? 'Désactiver' : 'Réactiver'}
          </button>
        </div>
      </form>
    </article>
  )
}

export const UserAdminPanel = ({ currentUserId, users }: UserAdminPanelProps) => (
  <div className="grid gap-6">
    <CreateUserForm />
    <section aria-label="Profils existants">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Profils existants</h2>
        <span className="text-xs font-semibold text-muted">{users.length} compte{users.length > 1 ? 's' : ''}</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {users.map((user) => (
          <UserCard key={user.id} user={user} isCurrentUser={user.id === currentUserId} />
        ))}
      </div>
    </section>
  </div>
)
