import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['300','500','600'] })

export const metadata: Metadata = {
  title: 'Cocoa Sushi — Reservaciones',
  description: 'Sistema de reservas de Cocoa Sushi, Barrio El Hoyón, Costa Rica',
  openGraph: {
    title: 'Cocoa Sushi — Reserva tu mesa',
    description: 'Fusión japonesa premium en Costa Rica',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="bg-cs-cream text-cs-dark antialiased">
        {children}
        <Toaster position="top-center" toastOptions={{
          style: { background: '#1A352E', color: '#F1F0EB', borderRadius: '10px' },
          success: { iconTheme: { primary: '#8D9B62', secondary: '#F1F0EB' } },
          error:   { iconTheme: { primary: '#9B6234', secondary: '#F1F0EB' } },
        }} />
      </body>
    </html>
  )
}
