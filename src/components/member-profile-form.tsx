'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMemberProfileAction, type MemberProfileActionState } from '@/app/(app)/family/actions'

type MemberProfileFormProps = { displayName: string, avatarTone: string, hasAvatar: boolean }
const initialState: MemberProfileActionState = {}
const tones = [
  { value: 'blue', label: 'Bleu', color: 'bg-[var(--app-avatar-blue)]' },
  { value: 'pink', label: 'Rose', color: 'bg-[var(--app-avatar-pink)]' },
  { value: 'cyan', label: 'Cyan', color: 'bg-[var(--app-avatar-cyan)]' },
  { value: 'lavender', label: 'Lavande', color: 'bg-[var(--app-avatar-lavender)]' },
]

export const MemberProfileForm = ({ displayName, avatarTone, hasAvatar }: MemberProfileFormProps) => {
  const router = useRouter()
  const [state, action, pending] = useActionState(updateMemberProfileAction, initialState)
  const [avatarMode, setAvatarMode] = useState(hasAvatar ? 'photo' : 'initials')
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    setAvatarError(null)
    const data = new FormData()
    data.set('file', file)
    const response = await fetch('/api/avatar', { method: 'POST', body: data })
    const result = await response.json()
    setUploading(false)
    if (!response.ok) return setAvatarError(result.message ?? 'L’avatar n’a pas été enregistré.')
    setAvatarMode('photo')
    router.refresh()
  }

  const selectInitialsAvatar = async () => {
    setAvatarError(null)
    const response = await fetch('/api/avatar', { method: 'DELETE' })
    if (!response.ok) return setAvatarError('L’avatar n’a pas pu être retiré.')
    setAvatarMode('initials')
    router.refresh()
  }

  return (
    <form action={action} className='rounded-card border border-border bg-surface p-5'>
      <h2 className='font-display text-lg font-semibold'>Modifier mon profil</h2>
      <label className='mt-4 grid gap-1.5 text-xs font-semibold'>Nom affiché<input name='displayName' required maxLength={120} defaultValue={displayName} className='rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal' /></label>
      <fieldset className='mt-4'><legend className='text-xs font-semibold'>Avatar</legend><div className='mt-2 grid gap-3'><label className={`cursor-pointer rounded-xl border p-3 text-xs font-semibold ${avatarMode === 'photo' ? 'border-primary bg-primary-soft' : 'border-border'}`}><span>Utiliser une photo</span><input className='mt-2 block w-full text-xs font-normal' type='file' accept='image/jpeg,image/png,image/webp' disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file) }} /></label><button type='button' onClick={() => void selectInitialsAvatar()} className={`rounded-xl border p-3 text-left text-xs font-semibold ${avatarMode === 'initials' ? 'border-primary bg-primary-soft' : 'border-border'}`}>Utiliser mes initiales</button></div></fieldset>
      {avatarMode === 'initials' ? <fieldset className='mt-4'><legend className='sr-only'>Couleur de l’avatar</legend><div className='flex flex-wrap gap-2'>{tones.map((tone) => <label key={tone.value} className='cursor-pointer'><input className='peer sr-only' type='radio' name='avatarTone' value={tone.value} defaultChecked={avatarTone === tone.value} aria-label={tone.label} /><span className={`block size-9 rounded-full border-2 border-transparent peer-checked:border-foreground ${tone.color}`} /></label>)}</div></fieldset> : <input type='hidden' name='avatarTone' value={avatarTone} />}
      {avatarError ? <p className='mt-3 text-xs text-danger'>{avatarError}</p> : null}
      {state.error ? <p className='mt-3 text-xs text-danger'>{state.error}</p> : null}
      {state.success ? <p className='mt-3 text-xs text-success'>{state.success}</p> : null}
      <button disabled={pending} className='mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50'>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  )
}
