'use client'

import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Images,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Avatar } from '@/components/avatar'
import type {
  PhotoGalleryItem,
  PhotoGalleryMember,
} from '@/lib/photos/queries'

type PhotoGalleryProps = {
  familyName: string
  members: PhotoGalleryMember[]
  photos: PhotoGalleryItem[]
}

export const PhotoGallery = ({
  familyName,
  members,
  photos: allPhotos,
}: PhotoGalleryProps) => {
  const [person, setPerson] = useState('all')
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  const photos = useMemo(() => person === 'all'
    ? allPhotos
    : allPhotos.filter((photo) => photo.ownerId === person), [allPhotos, person])
  const filterMembers = members.filter((member) => member.photoCount > 0)
  const activeIndex = activePhotoId === null
    ? -1
    : photos.findIndex((photo) => photo.id === activePhotoId)
  const activePhoto = activeIndex === -1 ? null : photos[activeIndex]
  const activePhotoPeople = activePhoto
    ? members.filter((member) => activePhoto.people.includes(member.id))
    : []
  const familyInitials = familyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'FM'

  useEffect(() => {
    if (!activePhoto) return

    const moveActivePhoto = (direction: -1 | 1) => {
      setActivePhotoId((currentPhotoId) => {
        const currentIndex = photos.findIndex((photo) => photo.id === currentPhotoId)

        if (currentIndex === -1) return null

        return photos[(currentIndex + direction + photos.length) % photos.length]?.id ?? null
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePhotoId(null)
      if (event.key === 'ArrowLeft') moveActivePhoto(-1)
      if (event.key === 'ArrowRight') moveActivePhoto(1)

      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        )

        if (!focusableElements.length) {
          event.preventDefault()
          dialogRef.current?.focus()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }
    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activePhoto, photos])

  const dialogOpen = activePhoto !== null

  useEffect(() => {
    if (!dialogOpen) return

    const elementToRestore = lastFocusedElementRef.current

    return () => elementToRestore?.focus()
  }, [dialogOpen])

  const showPreviousPhoto = () => {
    if (!photos.length || activeIndex === -1) return
    setActivePhotoId(photos[(activeIndex - 1 + photos.length) % photos.length]?.id ?? null)
  }

  const showNextPhoto = () => {
    if (!photos.length || activeIndex === -1) return
    setActivePhotoId(photos[(activeIndex + 1) % photos.length]?.id ?? null)
  }

  return (
    <>
      <div className='mb-3 flex items-baseline gap-2.5 min-[521px]:mb-4'>
        <h1 className='font-display text-2xl font-semibold tracking-[-0.03em] min-[521px]:text-[28px]'>
          Photos
        </h1>
        <span className='font-mono text-xs text-faint'>{photos.length}</span>
      </div>

      {allPhotos.length ? (
        <div
          role='tablist'
          aria-label='Filtrer selon la personne qui a ajouté la photo'
          className='mb-4 flex items-center gap-[5px] overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[521px]:mb-5 min-[521px]:flex-wrap min-[521px]:gap-[7px] min-[521px]:overflow-visible min-[521px]:pb-0'
        >
          <button
            type='button'
            role='tab'
            aria-selected={person === 'all'}
            onClick={() => {
              setPerson('all')
              setActivePhotoId(null)
            }}
            className={`flex shrink-0 items-center gap-[7px] rounded-[22px] border py-[5px] pl-[5px] pr-[11px] text-xs font-semibold transition-[transform,border-color,background-color,color] duration-200 hover:scale-[1.04] active:scale-96 ${person === 'all' ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface text-muted hover:border-primary-soft'}`}
          >
            <span className={`grid size-6 place-items-center rounded-full bg-primary text-[8px] font-extrabold text-white ${person === 'all' ? 'ring-2 ring-primary' : ''}`}>
              {familyInitials}
            </span>
            Tout le monde
            <span className={`rounded-lg px-1.5 py-px font-mono text-[9px] font-medium ${person === 'all' ? 'bg-primary text-white' : 'bg-surface-soft text-faint'}`}>
              {allPhotos.length}
            </span>
          </button>
          {filterMembers.map((member) => {
            const active = person === member.id

            return (
              <button
                key={member.id}
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => {
                  setPerson(member.id)
                  setActivePhotoId(null)
                }}
                className={`flex shrink-0 items-center gap-[7px] rounded-[22px] border py-[5px] pl-[5px] pr-[11px] text-xs font-semibold transition-[transform,border-color,background-color,color] duration-200 hover:scale-[1.04] active:scale-96 ${active ? 'border-primary bg-primary-soft text-primary-strong' : 'border-border bg-surface text-muted hover:border-primary-soft'}`}
              >
                <span className={`rounded-full ${active ? 'ring-2 ring-primary' : ''}`}>
                  <Avatar name={member.name} tone={member.tone} size='xs' />
                </span>
                {member.shortName}
                <span className={`rounded-lg px-1.5 py-px font-mono text-[9px] font-medium ${active ? 'bg-primary text-white' : 'bg-surface-soft text-faint'}`}>
                  {member.photoCount}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {photos.length ? (
        <section
          aria-label='Galerie photo'
          className='grid grid-cols-2 gap-1.5 min-[521px]:gap-2 min-[821px]:grid-cols-3 min-[821px]:gap-2.5 min-[1101px]:grid-cols-4'
        >
          {photos.map((photo) => (
            <button
              key={photo.id}
              type='button'
              onClick={(event) => {
                lastFocusedElementRef.current = event.currentTarget
                setActivePhotoId(photo.id)
              }}
              aria-label={`Ouvrir la photo : ${photo.caption}`}
              className='group animate-fade-up relative aspect-square overflow-hidden rounded-[16px] bg-surface-soft p-0 text-left'
            >
              <Image
                src={photo.thumbUrl}
                alt={photo.alt}
                fill
                unoptimized
                sizes='(max-width: 820px) 50vw, (max-width: 1100px) 33vw, 25vw'
                className='object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]'
              />
              <span
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'
              />
              <span className='pointer-events-none absolute left-2 top-2 z-10 flex opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&>span]:-ml-1.5 [&>span]:ring-2 [&>span]:ring-surface [&>span:first-child]:ml-0'>
                {photo.people.slice(0, 3).map((id) => {
                  const member = members.find((item) => item.id === id)
                  return member
                    ? <Avatar key={id} name={member.name} tone={member.tone} size='xs' />
                    : null
                })}
              </span>
            </button>
          ))}
        </section>
      ) : allPhotos.length ? (
        <div className='py-[60px] text-center'>
          <p className='text-[15px] font-semibold'>Pas encore de photo pour cette personne.</p>
        </div>
      ) : (
        <section className='rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center min-[521px]:py-18'>
          <span className='mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary'>
            <Images aria-hidden='true' size={22} />
          </span>
          <h2 className='mt-4 font-display text-lg font-semibold'>Le premier souvenir attend son heure.</h2>
          <p className='mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted'>
            Les photos publiées sur le mur apparaîtront ici pour être retrouvées plus facilement.
          </p>
        </section>
      )}

      {activePhoto ? (
        <div
          ref={dialogRef}
          role='dialog'
          aria-modal='true'
          aria-label={activePhoto.caption}
          tabIndex={-1}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivePhotoId(null)
          }}
          className='animate-fade-up fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md min-[521px]:p-6'
        >
          <button
            type='button'
            autoFocus
            onClick={() => setActivePhotoId(null)}
            aria-label='Fermer'
            className='absolute right-5 top-5 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-white/20'
          >
            <X size={24} />
          </button>
          <button
            type='button'
            onClick={showPreviousPhoto}
            aria-label='Photo précédente'
            className='absolute left-2.5 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-110 hover:bg-white/20 min-[521px]:left-5 min-[521px]:size-12'
          >
            <ChevronLeft size={28} />
          </button>
          <figure className='flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[16px] shadow-float'>
            <div className='flex min-h-0 flex-1 items-center justify-center bg-white/[0.04]'>
              <Image
                src={activePhoto.displayUrl}
                alt={activePhoto.alt}
                width={activePhoto.width}
                height={activePhoto.height}
                unoptimized
                sizes='min(920px, 100vw)'
                className='h-auto max-h-[55vh] w-auto max-w-full object-contain min-[521px]:max-h-[70vh]'
              />
            </div>
            <figcaption className='flex flex-col items-start gap-4 bg-surface px-5 py-5 min-[821px]:flex-row min-[821px]:items-end min-[821px]:justify-between min-[821px]:gap-5 min-[821px]:px-6'>
              <div className='min-w-0'>
                <span className='flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint'>
                  <span className='h-px w-[22px] bg-secondary' />
                  {activePhoto.month}
                </span>
                <p className='mb-3 mt-2 text-base font-semibold leading-[1.4]'>{activePhoto.caption}</p>
                {activePhotoPeople.length ? (
                  <div className='flex flex-wrap gap-2.5'>
                    {activePhotoPeople.map((member) => (
                      <span
                        key={member.id}
                        className='flex items-center gap-1.5 rounded-[20px] bg-surface-soft py-1 pl-1 pr-2.5 text-xs font-semibold'
                      >
                        <Avatar name={member.name} tone={member.tone} size='xs' />
                        {member.shortName}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className='flex shrink-0 flex-wrap items-center gap-2'>
                <a
                  href={activePhoto.postUrl}
                  className='inline-flex min-h-10 items-center gap-2 rounded-[22px] border border-border px-3.5 text-xs font-semibold text-muted transition-colors hover:border-primary-soft hover:text-foreground'
                >
                  Voir la publication
                  <ExternalLink size={14} />
                </a>
                <a
                  href={activePhoto.displayUrl}
                  download={`wall-be-back-${activePhoto.id}.webp`}
                  className='inline-flex min-h-10 items-center gap-2 rounded-[22px] bg-primary px-3.5 text-xs font-semibold text-white transition-[transform,background-color] hover:-translate-y-px hover:bg-primary-strong'
                >
                  <Download size={14} />
                  Télécharger
                </a>
              </div>
            </figcaption>
          </figure>
          <button
            type='button'
            onClick={showNextPhoto}
            aria-label='Photo suivante'
            className='absolute right-2.5 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:-translate-y-1/2 hover:scale-110 hover:bg-white/20 min-[521px]:right-5 min-[521px]:size-12'
          >
            <ChevronRight size={28} />
          </button>
          <span className='absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[20px] bg-white/10 px-3.5 py-1.5 font-mono text-[11px] text-white'>
            {activeIndex + 1} / {photos.length}
          </span>
        </div>
      ) : null}
    </>
  )
}
