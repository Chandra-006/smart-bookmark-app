import './globals.css'
import { Manrope, Playfair_Display } from 'next/font/google'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata = {
  title: 'Smart Bookmark App',
  description: 'A simple bookmark manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  )
}
