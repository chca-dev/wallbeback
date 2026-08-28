import { requireAdmin } from '@/lib/auth/session'

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAdmin()

  return children
}

export default AdminLayout
