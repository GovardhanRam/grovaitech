import Navbar from '@/components/public/Navbar'
import HeroSection from '@/components/public/HeroSection'
import MissionSection from '@/components/public/MissionSection'
import ServicesSection from '@/components/public/ServicesSection'
import TrustSection from '@/components/public/TrustSection'
import Footer from '@/components/public/Footer'

export const metadata = {
  title: 'Grovaitech | Enterprise AI Solutions & Career Training',
  description:
    'Empowering global enterprises with deterministic AI solutions while teaching individuals how to master high-value AI skills to earn a secure and happy living.',
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <MissionSection />
        <ServicesSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  )
}
