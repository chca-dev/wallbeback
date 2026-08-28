import type { Metadata } from 'next'
import { asc, eq } from 'drizzle-orm'
import { PageHeading } from '@/components/page-heading'
import { db } from '@/db/client'
import { users } from '@/db/schema/users'
import { requireAdmin } from '@/lib/auth/session'
import { UserAdminPanel } from './user-admin-panel'

export const metadata: Metadata = { title: 'Gestion des profils' }

const AdminUsersPage = async () => {
  const currentAdmin = await requireAdmin()
  const familyUsers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      email: users.email,
      role: users.role,
      avatarTone: users.avatarTone,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(eq(users.familyId, currentAdmin.familyId))
    .orderBy(asc(users.createdAt))

  return (
    <div className="mx-auto max-w-310 px-4 pb-28 pt-9 sm:px-6 md:px-8 md:pb-16 md:pt-12 lg:px-13">
      <PageHeading
        eyebrow="Administration"
        title="Les profils de"
        accent={currentAdmin.familyName}
        description="Crée et gère les accès des adultes et des enfants de la famille."
      />
      <UserAdminPanel currentUserId={currentAdmin.id} users={familyUsers} />
    </div>
  )
}

export default AdminUsersPage
