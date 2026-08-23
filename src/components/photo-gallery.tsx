'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/avatar'
import { demoPhotos, familyMembers } from '@/lib/demo-data'

export const PhotoGallery = () => {
  const [person, setPerson] = useState('all')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const photos = useMemo(() => person === 'all'
    ? demoPhotos
    : demoPhotos.filter((photo) => photo.people.includes(person)), [person])

  const activePhoto = activeIndex === null ? null : photos[activeIndex]
  const activePhotoPeople = activePhoto
    ? familyMembers.filter((member) => activePhoto.people.includes(member.id))
    : []

  useEffect(() => {
    if (activeIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowLeft') setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length)
      if (event.key === 'ArrowRight') setActiveIndex((current) => current === null ? null : (current + 1) % photos.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, photos.length])

  return (
    <>
      <div className="mb-3 flex items-baseline gap-2.5 min-[521px]:mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] min-[521px]:text-[28px]">Photos</h1>
        <span className="font-mono text-xs text-faint">{photos.length}</span>
      </div>

      <div
        role="tablist"
        aria-label="Filtrer par personne"
        className="mb-4 flex items-center gap-[5px] overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[521px]:mb-5 min-[521px]:flex-wrap min-[521px]:gap-[7px] min-[521px]:overflow-visible min-[521px]:pb-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={person === 'all'}
          onClick={() => { setPerson('all'); setActiveIndex(null); }}
          className={`flex shrink-0 items-center gap-[7px] rounded-[22px] border py-[5px] pl-[5px] pr-[11px] text-xs font-semibold transition-[transform,border-color,background-color,color] duration-200 hover:scale-[1.04] active:scale-96 ${person === 'all' ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface text-muted hover:border-primary-soft'}`}
        >
          <span className={`grid size-6 place-items-center rounded-full bg-primary text-[8px] font-extrabold text-white ${person === 'all' ? 'ring-2 ring-primary' : ''}`}>FM</span>
          Tout le monde
          <span className={`rounded-lg px-1.5 py-px font-mono text-[9px] font-medium ${person === 'all' ? 'bg-primary text-white' : 'bg-surface-soft text-faint'}`}>{demoPhotos.length}</span>
        </button>
        {familyMembers.map((member) => {
          const count = demoPhotos.filter((photo) => photo.people.includes(member.id)).length
          const active = person === member.id

          return (
            <button
              key={member.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setPerson(member.id); setActiveIndex(null); }}
              className={`flex shrink-0 items-center gap-[7px] rounded-[22px] border py-[5px] pl-[5px] pr-[11px] text-xs font-semibold transition-[transform,border-color,background-color,color] duration-200 hover:scale-[1.04] active:scale-96 ${active ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface text-muted hover:border-primary-soft'}`}
            >
              <span className={`rounded-full ${active ? 'ring-2 ring-primary' : ''}`}>
                <Avatar name={member.name} tone={member.tone} size="xs" />
              </span>
              {member.shortName}
              <span className={`rounded-lg px-1.5 py-px font-mono text-[9px] font-medium ${active ? 'bg-primary text-white' : 'bg-surface-soft text-faint'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {photos.length ? (
        <section aria-label="Galerie photo" className="grid grid-cols-2 gap-1.5 min-[521px]:gap-2 min-[821px]:grid-cols-3 min-[821px]:gap-2.5 min-[1101px]:grid-cols-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ouvrir la photo : ${photo.caption}`}
              className="group animate-fade-up relative aspect-square overflow-hidden rounded-[16px] bg-surface-soft p-0 text-left"
            >
              {/* External demo assets are replaced by private media routes in the PostgreSQL milestone. */}
              <img
                src={photo.url}
                alt={photo.alt}
                loading="lazy"
                className="size-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]"
              />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="pointer-events-none absolute left-2 top-2 z-10 flex opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&>span]:-ml-1.5 [&>span]:ring-2 [&>span]:ring-surface [&>span:first-child]:ml-0">
                {photo.people.slice(0, 3).map((id) => {
                  const member = familyMembers.find((item) => item.id === id)
                  return member ? <Avatar key={id} name={member.name} tone={member.tone} size="xs" /> : null
                })}
              </span>
            </button>
          ))}
        </section>
      ) : (
        <div className="py-[60px] text-center">
          <p className="text-[15px] font-semibold">Pas encore de photo pour cette personne.</p>
        </div>
      )}

      {activePhoto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.caption}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}
          className="animate-fade-up fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md min-[521px]:p-6"
        >
          <button
            type="button"
            autoFocus
            onClick={() => setActiveIndex(null)}
            aria-label="Fermer"
            className="absolute right-5 top-5 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex(((activeIndex ?? 0) - 1 + photos.length) % photos.length)}
            aria-label="Photo précédente"
            className="absolute left-2.5 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-110 hover:bg-white/20 min-[521px]:left-5 min-[521px]:size-12"
          >
            <ChevronLeft size={28} />
          </button>
          <figure className="flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[16px] shadow-float">
            <img src={activePhoto.url} alt={activePhoto.alt} className="max-h-[55vh] w-full rounded-t-[16px] bg-white/[0.04] object-contain min-[521px]:max-h-[70vh]" />
            <figcaption className="flex flex-col items-start gap-4 rounded-b-[16px] bg-surface px-5 py-5 min-[821px]:flex-row min-[821px]:items-end min-[821px]:justify-between min-[821px]:gap-5 min-[821px]:px-6">
              <div>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                  <span className="h-px w-[22px] bg-secondary" />
                  {activePhoto.month}
                </span>
                <p className="mb-3 mt-2 text-base font-semibold leading-[1.4]">{activePhoto.caption}</p>
                <div className="flex flex-wrap gap-2.5">
                  {activePhotoPeople.map((member) => (
                    <span key={member.id} className="flex items-center gap-1.5 rounded-[20px] bg-surface-soft py-1 pl-1 pr-2.5 text-xs font-semibold">
                      <Avatar name={member.name} tone={member.tone} size="xs" />
                      {member.shortName}
                    </span>
                  ))}
                </div>
              </div>
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={() => setActiveIndex(((activeIndex ?? 0) + 1) % photos.length)}
            aria-label="Photo suivante"
            className="absolute right-2.5 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-110 hover:bg-white/20 min-[521px]:right-5 min-[521px]:size-12"
          >
            <ChevronRight size={28} />
          </button>
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[20px] bg-white/10 px-3.5 py-1.5 font-mono text-[11px] text-white">
            {(activeIndex ?? 0) + 1} / {photos.length}
          </span>
        </div>
      ) : null}
    </>
  )
}
