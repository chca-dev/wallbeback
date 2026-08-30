import type { Metadata, Viewport } from 'next'
import { DM_Mono, Manrope, Space_Grotesk } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ThemeMode, ThemePalette } from '@/db/schema/enums'
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
  applicationName: 'Wall Be Back',
  title: {
    default: 'Wall Be Back',
    template: '%s · Wall Be Back',
  },
  description: 'Le petit espace privé de la famille.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Wall Be Back',
  },
}

export const viewport: Viewport = {
  themeColor: '#5b6cf9',
}

const modes: ThemeMode[] = ['light', 'dark', 'system']
const palettes: ThemePalette[] = ['violet', 'terracotta', 'ocean']

const RootLayout = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const rawTheme = (await cookies()).get('wall_be_back_theme')?.value
  const [rawMode, rawPalette] = rawTheme?.split(':') ?? []
  const mode = modes.includes(rawMode as ThemeMode) ? rawMode as ThemeMode : 'system'
  const palette = palettes.includes(rawPalette as ThemePalette) ? rawPalette as ThemePalette : 'violet'

  return <html lang='fr' data-mode={mode} data-palette={palette} className={`${manrope.variable} ${spaceGrotesk.variable} ${dmMono.variable}`}><body>{children}</body></html>
}

export default RootLayout
