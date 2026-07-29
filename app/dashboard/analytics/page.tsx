'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Download
} from 'lucide-react'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')

  const weeklyTraffic = [120, 160, 140, 210, 240, 190, 290]
  const monthlyTraffic = [450, 520, 600, 480, 720, 690, 810, 750, 920, 890, 1050, 1180]

  const responseTimes = [1.2, 0.9, 1.4, 0.8, 1.1, 0.7, 0.9]

  const trafficData = timeRange === 'week' ? weeklyTraffic : monthlyTraffic
  const trafficLabels = timeRange === 'week' 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // SVG Chart sizing
  const width = 600
  const height = 150
  const maxTraffic = Math.max(...trafficData)
  
  const points = trafficData.map((val, idx) => {
    const x = (idx / (trafficData.length - 1)) * width
    const y = height - (val / maxTraffic) * (height - 30)
    return `${x},${y}`
  })
  
  const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`
  const strokePath = `M ${points.join(' L ')}`

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Performance Analytics</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time insights and call-answering analytics for deployed AI Employees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-[#0F172A] border border-[#1E293B] text-xs font-semibold text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="week">Weekly View</option>
            <option value="month">Monthly View</option>
          </select>
          <button className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#1E293B] hover:bg-[#0F172A] border border-[#1E293B] text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-all">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8] tracking-wide uppercase">Call Answer Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">99.85%</span>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              +0.12% vs last week
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8] tracking-wide uppercase">Avg response time</span>
            <div className="p-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">0.92s</span>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              -120ms latency drop
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8] tracking-wide uppercase">Lead Score Accuracy</span>
            <div className="p-2 rounded-xl bg-[#60A5FA]/10 text-[#60A5FA]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">94.2%</span>
            <p className="text-[10px] text-[#94A3B8] font-semibold">Matched CRM conversions</p>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Area Chart: Traffic Volumes (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Conversation Volume Trend</h3>
              <p className="text-[10px] text-[#94A3B8]">Inbound chats resolved by the agent pipeline</p>
            </div>
            <span className="text-[10px] font-semibold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/25 px-2.5 py-0.5 rounded-full">
              Inbound Load
            </span>
          </div>

          <div className="pt-4">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-48 overflow-visible text-[#3B82F6]"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2={width} y2="30" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2={width} y2="80" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="0" y1="130" x2={width} y2="130" stroke="#1E293B" strokeWidth="0.5" />

              <path d={areaPath} fill="url(#area-grad)" />
              <path d={strokePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Plot points */}
              {points.map((pt, idx) => {
                const [x, y] = pt.split(',')
                return (
                  <circle 
                    key={idx} 
                    cx={x} 
                    cy={y} 
                    r="4" 
                    fill="#0F172A" 
                    stroke="#3b82f6" 
                    strokeWidth="1.5" 
                    className="hover:scale-125 transition-transform cursor-pointer"
                  />
                )
              })}
            </svg>
            <div className="flex justify-between text-[9px] text-[#94A3B8] font-semibold px-2 mt-2">
              {trafficLabels.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart: Latency distribution (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Response Latency (sec)</h3>
            <p className="text-[10px] text-[#94A3B8]">Daily response speed averaged per call</p>
          </div>

          <div className="space-y-3 pt-2">
            {responseTimes.map((time, idx) => {
              const maxVal = Math.max(...responseTimes)
              const percentage = (time / maxVal) * 100
              const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]
              
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-8 text-[10px] text-[#94A3B8] font-semibold">{dayLabel}</span>
                  <div className="flex-1 bg-[#0F172A] rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#3B82F6] rounded-full h-2 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-right text-[10px] text-slate-300 font-mono">{time}s</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Row 3: Industry Share breakdown */}
      <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Automation Deployment by Industry</h3>
          <p className="text-[10px] text-[#94A3B8]">Distribution of active AI Employees across target sectors</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0F172A]/50 border border-[#1E293B]">
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Clinics</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold text-white">45%</span>
              <span className="text-[9px] text-emerald-400 font-semibold">+6%</span>
            </div>
            <div className="w-full bg-[#0F172A] h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#3B82F6] h-1" style={{ width: '45%' }}></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A]/50 border border-[#1E293B]">
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Law Firms</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold text-white">25%</span>
              <span className="text-[9px] text-slate-500 font-semibold">0%</span>
            </div>
            <div className="w-full bg-[#0F172A] h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#60A5FA] h-1" style={{ width: '25%' }}></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A]/50 border border-[#1E293B]">
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Salons</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold text-white">20%</span>
              <span className="text-[9px] text-emerald-400 font-semibold">+11%</span>
            </div>
            <div className="w-full bg-[#0F172A] h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-1" style={{ width: '20%' }}></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A]/50 border border-[#1E293B]">
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Others (SMEs)</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold text-white">10%</span>
              <span className="text-[9px] text-amber-500 font-semibold">-2%</span>
            </div>
            <div className="w-full bg-[#0F172A] h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-1" style={{ width: '10%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
