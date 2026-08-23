import type { Metadata } from 'next'
import { WallFeed } from '@/components/wall-feed'
import { PageHeading } from '@/components/page-heading'

export const metadata: Metadata = { title: 'Le mur' }

const WallPage = () => (
  <div className="mx-auto max-w-[1240px] px-4 pb-[98px] pt-[29px] min-[521px]:px-5 min-[521px]:pb-[100px] min-[521px]:pt-[34px] min-[821px]:px-8 min-[821px]:pb-[70px] min-[821px]:pt-[52px] min-[1101px]:px-[52px]">
    <PageHeading
      eyebrow="Le mur de la famille"
      title="Ce qui se passe"
      accent="chez nous."
      description="Les petits moments, les grandes histoires et tout ce qu’on a envie de se raconter."
    />

    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,680px)_minmax(230px,290px)] lg:gap-12">
      <section aria-label="Fil familial" className="min-w-0">
        <WallFeed />
      </section>
      <aside className="sticky top-28 hidden rounded-card border border-border bg-surface p-5 lg:block">
        <p className="font-display text-sm font-semibold">Un espace vraiment privé</p>
        <p className="mt-3 text-xs leading-6 text-muted">Seuls les membres invités par l’administrateur peuvent lire et écrire ici. Les publications marquées « Adultes » restent invisibles aux comptes enfants.</p>
      </aside>
    </div>
  </div>
)

export default WallPage
