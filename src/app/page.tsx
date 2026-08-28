import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

const HomePage = async () => {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  redirect(currentUser.mustChangePassword ? '/change-password' : '/wall')
}

export default HomePage
