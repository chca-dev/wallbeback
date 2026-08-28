import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/app/login/login-form'
import { getCurrentUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Connexion' }

const LoginPage = async () => {
  const currentUser = await getCurrentUser()

  if (currentUser) {
    redirect(currentUser.mustChangePassword ? '/change-password' : '/wall')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-[430px] rounded-[24px] border border-border bg-surface p-6 shadow-float min-[521px]:p-9">
        <div className="flex items-center gap-3 font-display text-lg font-bold tracking-[-0.04em]">
          <span className="grid size-10 -rotate-[7deg] place-items-center rounded-[13px] bg-primary text-white">
            <Sparkles size={20} />
          </span>
          Wall Be Back
        </div>
        <p className="mt-10 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">Espace privé</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-none tracking-[-0.045em]">
          Bon retour<br />
          <span className="text-primary">à la maison.</span>
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Connecte-toi avec le compte créé par l’administrateur de la famille.
        </p>
        <LoginForm />
      </section>
    </main>
  )
}

export default LoginPage
