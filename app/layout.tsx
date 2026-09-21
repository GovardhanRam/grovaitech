import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: false,
  themeColor: '#00142E',
}

export const metadata: Metadata = {
  title: 'Grovaitech | AI Employees for Business',
  description: 'We Don’t Sell Software. We Deploy AI Employees. Specialized AI Employees that handle real conversations, automate workflows, and deliver measurable business results.',
  icons: {
    icon: '/images/Grovaitech_Logo_Optimized.png',
    apple: '/images/Grovaitech_Logo_Optimized.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  )
}
