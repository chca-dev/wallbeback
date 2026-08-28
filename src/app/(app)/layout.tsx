import { AppShell } from '@/components/app-shell'
import type { AvatarTone } from '@/lib/demo-data'
import { requireCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']

const getAvatarTone = (tone: string): AvatarTone => avatarTones.includes(tone as AvatarTone)
  ? tone as AvatarTone
  : 'blue'

const PrivateLayout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await requireCurrentUser()

  if (currentUser.mustChangePassword) {
    redirect('/change-password')
  }

  return (
    <AppShell
      user={{
        displayName: currentUser.displayName,
        familyName: currentUser.familyName,
        role: currentUser.role,
        avatarTone: getAvatarTone(currentUser.avatarTone),
      }}
    >
      {children}
    </AppShell>
  )
}

export default PrivateLayout
