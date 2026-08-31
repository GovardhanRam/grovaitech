import PublicNav from '@/components/public/PublicNav'
import HeroSection from '@/components/public/HeroSection'
import IndustryStrip from '@/components/public/IndustryStrip'
import ProductCards from '@/components/public/ProductCards'
import HowItWorksSection from '@/components/public/HowItWorksSection'
import NewsletterSection from '@/components/public/NewsletterSection'
import PublicFooter from '@/components/public/PublicFooter'

import fs from 'fs'
import path from 'path'

export const metadata = {
  title: 'Grovaitech | Deploy AI Employees for Business',
  description:
    'We Don’t Sell Software. We Deploy AI Employees. Specialized AI Employees that handle real conversations, automate workflows, and deliver measurable business results.',
}

// Copy exact uploaded logo asset to public directory if present
try {
  const uploadedLogoPath = 'C:/Users/govar/.gemini/antigravity/brain/bb50ad48-25e1-4038-9e00-13fcb9366e4d/.user_uploaded/media_1788212666506.png'
  const targetLogoPath = path.join(process.cwd(), 'public', 'images', 'grovaitech-navbar-logo-240x84.png')
  if (fs.existsSync(uploadedLogoPath)) {
    fs.copyFileSync(uploadedLogoPath, targetLogoPath)
  }
} catch (err) {
  console.error('Logo sync error:', err)
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <PublicNav />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with Command Interaction and Real Estate Lead Receptionist Demo */}
        <HeroSection />

        {/* Industry Strip: Truthful "Built for businesses across industries" */}
        <IndustryStrip />

        {/* AI Workforce & Product Navigation Cards (AI Employees, Solutions, How It Works, Blog, Suggestion) */}
        <ProductCards />

        {/* Deployment Process & Technology Details */}
        <HowItWorksSection />

        {/* Newsletter / Updates Section */}
        <NewsletterSection />
      </main>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  )
}
