import type { Metadata } from 'next'
import { Camera, CalendarDays } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { PageHeading } from '@/components/page-heading'
import { familyMembers } from '@/lib/demo-data'

export const metadata: Metadata = { title: 'Famille' }

const FamilyPage = () => (
	<div className="mx-auto max-w-310 px-4 pb-28 pt-9 sm:px-6 md:px-8 md:pb-16 md:pt-12 lg:px-13">
		<PageHeading
			eyebrow="Famille Martin"
			title="Notre joyeux"
			accent="petit monde."
			description="Les visages derrière les messages, les anniversaires et les photos qu’on ressortira au pire moment possible."
		/>
		<section
			aria-label="Membres de la famille"
			className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
		>
			{familyMembers.map(member => (
				<article
					key={member.id}
					className="group rounded-card border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary-soft"
				>
					<div className="flex items-center gap-4">
						<Avatar name={member.name} tone={member.tone} size="lg" />
						<div className="min-w-0">
							<h2 className="truncate font-display text-base font-semibold">
								{member.name}
							</h2>
							<p className="text-xs text-muted">{member.role}</p>
						</div>
					</div>
					<div className="mt-5 flex gap-4 border-t border-border pt-4 text-[11px] font-semibold text-muted">
						<span className="flex items-center gap-1.5">
							<Camera size={14} /> {member.photoCount} photos
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

export default FamilyPage
