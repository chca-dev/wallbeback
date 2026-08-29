import Image from 'next/image'
import type { AvatarTone } from '@/lib/demo-data'

const tones: Record<AvatarTone, string> = {
  blue: 'bg-[var(--app-avatar-blue)]',
  pink: 'bg-[var(--app-avatar-pink)]',
  cyan: 'bg-[var(--app-avatar-cyan)]',
  lavender: 'bg-[var(--app-avatar-lavender)]',
}

type AvatarProps = {
  name: string
  tone?: AvatarTone
  size?: 'xs' | 'sm' | 'md' | 'lg'
  imageUrl?: string | null
}

const sizes = {
  xs: 'size-6 text-[8px]',
  sm: 'size-7 text-[9px]',
  md: 'size-9 text-[10px]',
  lg: 'size-11 text-xs',
}

export const Avatar = ({ name, tone = 'blue', size = 'md', imageUrl }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span
      aria-label={name}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-extrabold tracking-[-0.03em] text-white ${tones[tone]} ${sizes[size]}`}
    >
      {imageUrl ? <Image src={imageUrl} alt='' fill unoptimized sizes='44px' className='object-cover' /> : initials}
    </span>
  )
}
