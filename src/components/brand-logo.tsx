import Image from 'next/image'

type BrandLogoProps = {
  size?: 'sm' | 'lg'
}

export const BrandLogo = ({ size = 'sm' }: BrandLogoProps) => (
  <span
    aria-hidden='true'
    className={`grid shrink-0 -rotate-[7deg] place-items-center bg-primary transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.08] ${size === 'lg' ? 'size-10 rounded-[13px] p-1.5' : 'size-7.5 rounded-[10px] p-1'}`}
  >
    <Image
      src='/wall-be-back-icon-white.png'
      alt=''
      width={400}
      height={253}
      priority
      sizes={size === 'lg' ? '28px' : '22px'}
      className='h-auto w-full'
    />
  </span>
)
