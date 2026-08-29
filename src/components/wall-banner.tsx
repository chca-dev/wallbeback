'use client'

import Image from 'next/image'
import { ImagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ImageCropDialog, type CropSelection } from '@/components/image-crop-dialog'

type WallBannerProps = {
  familyId: string
  kingName: string
  canChange: boolean
  hasBanner: boolean
}

export const WallBanner = ({ familyId, kingName, canChange, hasBanner }: WallBannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [version, setVersion] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)

  const upload = async (file: File, crop: CropSelection) => {
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('crop', JSON.stringify(crop))
    const response = await fetch('/api/banner', { method: 'POST', body: formData })
    const result = await response.json()
    setUploading(false)
    if (!response.ok) return setError(result.message ?? 'La bannière n’a pas été enregistrée.')
    setVersion(Date.now())
  }

  return <><section className='relative mb-5 aspect-[4/1] min-h-48 overflow-hidden rounded-[22px] border border-border bg-surface-soft'>
    {hasBanner || version ? <Image src={`/banner/${familyId}?v=${version}`} alt='' fill unoptimized priority sizes='(max-width: 1280px) 100vw, 1136px' className='object-cover' /> : <div className='absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,var(--app-primary-soft),transparent_48%),linear-gradient(135deg,var(--app-surface-soft),var(--app-surface-pink))]' />}
    <div className='absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/25' />
    <strong className='absolute bottom-5 left-5 font-display text-2xl font-semibold text-white min-[521px]:bottom-6 min-[521px]:left-7'>{kingName}</strong>
    {canChange ? <><input ref={inputRef} type='file' accept='image/jpeg,image/png,image/webp' className='sr-only' onChange={(event) => { const file = event.target.files?.[0]; if (file) setCropFile(file); event.target.value = '' }} /><button type='button' disabled={uploading} onClick={() => inputRef.current?.click()} className='absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/25 bg-black/45 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50'><ImagePlus size={15} /> {uploading ? 'Chargement…' : 'Changer la bannière'}</button></> : null}
    {error ? <p role='alert' className='absolute bottom-3 right-4 rounded-lg bg-black/70 px-3 py-2 text-xs text-white'>{error}</p> : null}
  </section>{cropFile ? <ImageCropDialog file={cropFile} aspect={4} title='Cadrer la bannière' onCancel={() => setCropFile(null)} onConfirm={(crop) => { const file = cropFile; setCropFile(null); void upload(file, crop) }} /> : null}</>
}
