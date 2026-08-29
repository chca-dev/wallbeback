import type { Metadata } from 'next'
import Link from 'next/link'
import { and, count, eq } from 'drizzle-orm'
import { CalendarDays, Camera, Crown } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { PageHeading } from '@/components/page-heading'
import { db } from '@/db/client'
import { photoPeople } from '@/db/schema/photos'
import { users } from '@/db/schema/users'
import { requireCurrentUser } from '@/lib/auth/session'
import type { AvatarTone } from '@/lib/avatar'
import { getBannerKing } from '@/lib/banner-rotation'

export const metadata: Metadata = { title: 'Famille' }

const avatarTones: AvatarTone[] = ['blue', 'pink', 'cyan', 'lavender']

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
				avatarTone: users.avatarTone,
				avatarStorageKey: users.avatarStorageKey,
				createdAt: users.createdAt,
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
	const bannerKing = getBannerKing(familyUsers)
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
					<Link
						key={member.id}
						href={`/family/${member.id}`}
						className="group rounded-card border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary-soft"
					>
						<div className="flex items-center gap-4">
							<Avatar name={member.displayName} tone={getAvatarTone(member.avatarTone)} imageUrl={member.avatarStorageKey ? `/avatar/${member.id}` : null} size="lg" />
							<div className="min-w-0">
								<div className='flex flex-wrap items-center gap-2'><h2 className="truncate font-display text-base font-semibold">{member.displayName}</h2>{bannerKing?.id === member.id ? <span className='flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-secondary'><Crown size={15} aria-hidden='true' /> Roi de la bannière</span> : null}</div>
								<p className="text-xs text-muted">Voir la fiche</p>
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
					</Link>
				))}
			</section>
		</div>
	)
}

export default FamilyPage
