import type { Metadata } from 'next'
import { and, count, eq } from 'drizzle-orm'
import { Camera, CalendarDays } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { PageHeading } from '@/components/page-heading'
import { db } from '@/db/client'
import type { UserRole } from '@/db/schema/enums'
import { photoPeople } from '@/db/schema/photos'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'
import type { AvatarTone } from '@/lib/demo-data'

export const metadata: Metadata = { title: 'Famille' }

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']

const roleLabels: Record<UserRole, string> = {
	admin: 'Admin',
	adult: 'Adulte',
	child: 'Enfant',
}

const getAvatarTone = (tone: string): AvatarTone => (
	avatarTones.includes(tone as AvatarTone) ? tone as AvatarTone : 'blue'
)

const FamilyPage = async () => {
	const currentUser = await requireCurrentUser()
	const [familyUsers, taggedPhotoCounts] = await Promise.all([
		db
			.select({
				id: users.id,
				displayName: users.displayName,
				role: users.role,
				avatarTone: users.avatarTone,
			})
			.from(users)
			.where(and(eq(users.familyId, currentUser.familyId), eq(users.isActive, true)))
			.orderBy(users.createdAt),
		db
			.select({ userId: photoPeople.userId, value: count() })
			.from(photoPeople)
			.where(eq(photoPeople.familyId, currentUser.familyId))
			.groupBy(photoPeople.userId),
	])
	const photoCountByUser = new Map(taggedPhotoCounts.map(({ userId, value }) => [userId, value]))

	return (
		<div className="mx-auto max-w-310 px-4 pb-28 pt-9 sm:px-6 md:px-8 md:pb-16 md:pt-12 lg:px-13">
			<PageHeading
				eyebrow={currentUser.familyName}
				title="Notre joyeux"
				accent="petit monde."
				description="Les visages derrière les messages, les anniversaires et les photos qu’on ressortira au pire moment possible."
			/>
			<section
				aria-label="Membres de la famille"
				className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
			>
				{familyUsers.map((member) => (
					<article
						key={member.id}
						className="group rounded-card border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary-soft"
					>
						<div className="flex items-center gap-4">
							<Avatar name={member.displayName} tone={getAvatarTone(member.avatarTone)} size="lg" />
							<div className="min-w-0">
								<h2 className="truncate font-display text-base font-semibold">
									{member.displayName}
								</h2>
								<p className="text-xs text-muted">{roleLabels[member.role]}</p>
							</div>
						</div>
						<div className="mt-5 flex gap-4 border-t border-border pt-4 text-[11px] font-semibold text-muted">
							<span className="flex items-center gap-1.5">
								<Camera size={14} /> {photoCountByUser.get(member.id) ?? 0} photos
							</span>
							<span className="flex items-center gap-1.5">
								<CalendarDays size={14} /> À jour
							</span>
						</div>
					</article>
				))}
			</section>
		</div>
	)
}

export default FamilyPage
