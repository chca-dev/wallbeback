import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/app/change-password/change-password-form'
import { requireCurrentUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

const ChangePasswordPage = async () => {
  const currentUser = await requireCurrentUser()

  if (!currentUser.mustChangePassword) {
    redirect('/wall')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-[430px] rounded-[24px] border border-border bg-surface p-6 shadow-float min-[521px]:p-9">
        <span className="grid size-11 place-items-center rounded-[14px] bg-primary-soft text-primary-strong">
          <ShieldCheck size={22} />
        </span>
        <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">Première connexion</p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-none tracking-[-0.045em]">
          Choisis ton propre<br />
          <span className="text-primary">mot de passe.</span>
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Bonjour {currentUser.displayName}. Le mot de passe temporaire ne sera plus utilisable après cette étape.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  )
}

export default ChangePasswordPage
