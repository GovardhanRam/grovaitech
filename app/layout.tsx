import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Grovaitech - AI Employees for Business',
  description: 'We Don\'t Sell Software. We Deploy AI Employees.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0F172A] text-white">
        {children}
      </body>
    </html>
  )
}
