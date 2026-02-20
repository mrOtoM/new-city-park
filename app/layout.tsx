import './globals.css'

import { Josefin_Sans } from 'next/font/google'
import ThemeProvider from '@/components/ThemeProvider'

const josefin = Josefin_Sans({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: {
    template: '%s - New City Park',
    default: 'Welcome - New City Park',
  },
  description: 'Train with New City Park',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <body
        className={`${josefin.className} bg-primary-950 text-primary-100`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
