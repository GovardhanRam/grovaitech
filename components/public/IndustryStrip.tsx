import {
  Building2,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Briefcase,
  Landmark,
} from 'lucide-react'

export default function IndustryStrip() {
  const industries = [
    { name: 'Real Estate', icon: Building2 },
    { name: 'Healthcare', icon: HeartPulse },
    { name: 'Education', icon: GraduationCap },
    { name: 'Retail', icon: ShoppingBag },
    { name: 'Services', icon: Briefcase },
    { name: 'Finance', icon: Landmark },
  ]

  return (
    <section className="border-y border-slate-100 bg-slate-50/60 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-500 uppercase mb-8">
          Built for businesses across industries
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {industries.map((ind) => {
            const Icon = ind.icon
            return (
              <div
                key={ind.name}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-200 hover:shadow-xs transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  {ind.name}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
