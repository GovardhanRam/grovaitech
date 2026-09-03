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
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  )
}
