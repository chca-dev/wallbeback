import type { Metadata } from 'next'
import { DM_Mono, Manrope, Space_Grotesk } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Wall Be Back',
    template: '%s · Wall Be Back',
  },
  description: 'Le petit espace privé de la famille Martin.',
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html
    lang="fr"
    data-mode="system"
    data-palette="violet"
    className={`${manrope.variable} ${spaceGrotesk.variable} ${dmMono.variable}`}
  >
    <body>{children}</body>
  </html>
)

export default RootLayout
