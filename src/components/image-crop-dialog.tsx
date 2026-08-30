'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Area, Point } from 'react-easy-crop'

const Cropper = dynamic(() => import('react-easy-crop'), { ssr: false })

export type CropSelection = Pick<Area, 'x' | 'y' | 'width' | 'height'>

type ImageCropDialogProps = {
  file: File
  aspect: number
  title: string
  onCancel: () => void
  onConfirm: (crop: CropSelection) => void
}

export const ImageCropDialog = ({ file, aspect, title, onCancel, onConfirm }: ImageCropDialogProps) => {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file])
  const revokeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selection, setSelection] = useState<CropSelection | null>(null)

  useEffect(() => {
    if (revokeTimeout.current) clearTimeout(revokeTimeout.current)

    return () => {
      revokeTimeout.current = setTimeout(() => URL.revokeObjectURL(imageUrl), 0)
    }
  }, [imageUrl])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const dialog = dialogRef.current
    document.body.style.overflow = 'hidden'
    dialog?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusableElements = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (!focusableElements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onCancel])

  return <div role='dialog' aria-modal='true' aria-label={title} className='fixed inset-0 z-100 grid place-items-center bg-black/75 p-4'>
    <div ref={dialogRef} tabIndex={-1} className='w-full max-w-3xl rounded-card border border-border bg-surface p-4 shadow-float'>
      <h2 className='font-display text-lg font-semibold'>{title}</h2>
      <p className='mt-1 text-xs text-muted'>Déplace l’image et ajuste le zoom pour choisir la zone conservée.</p>
      <div className='relative mt-4 h-[min(58vh,460px)] overflow-hidden rounded-xl bg-black'>{imageUrl ? <Cropper image={imageUrl} crop={crop} zoom={zoom} rotation={0} aspect={aspect} minZoom={1} maxZoom={3} cropShape='rect' showGrid={false} zoomSpeed={1} style={{}} classes={{}} restrictPosition mediaProps={{}} cropperProps={{}} keyboardStep={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(area) => setSelection(area)} /> : null}</div>
      <label className='mt-4 flex items-center gap-3 text-xs font-semibold'>Zoom<input className='min-w-0 flex-1 accent-primary' type='range' min={1} max={3} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className='mt-4 flex justify-end gap-2'><button type='button' onClick={onCancel} className='rounded-xl px-4 py-2.5 text-xs font-semibold text-muted'>Annuler</button><button type='button' disabled={!selection} onClick={() => { if (selection) onConfirm(selection) }} className='rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40'>Utiliser ce cadrage</button></div>
    </div>
  </div>
}
