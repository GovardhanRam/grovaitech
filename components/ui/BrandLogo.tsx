'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/BrandLogo.tsx
 *
 * Official Grovaitech GR logo component supporting symbol, horizontal, and stacked variants.
 * Uses exact SVG vector definitions for pixel-perfect crispness across high-DPI Android displays.
 */

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export interface BrandLogoProps {
  variant?: 'horizontal' | 'symbol' | 'stacked' | 'raster'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  href?: string
  className?: string
  priority?: boolean
  showTagline?: boolean
  inverted?: boolean // for dark navy backgrounds
}

const sizeHeights = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 64,
}

export function BrandLogoSymbol({
  size = 36,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 148 90"
      fill="none"
      width={size * (148 / 90)}
      height={size}
      className={className}
      role="img"
      aria-label="Grovaitech GR Mark"
    >
      {/* G Element: Blue Circular Ring with Arrow Head pointing Up-Right */}
      <path
        d="M 44 4 C 21.9 4 4 21.9 4 44 C 4 66.1 21.9 84 44 84 C 62.4 84 77.8 71.6 82.5 54.8 L 67 50.3 C 63.8 61.1 54.8 68.8 44 68.8 C 30.3 68.8 19.2 57.7 19.2 44 C 19.2 30.3 30.3 19.2 44 19.2 C 52.7 19.2 60.2 23.6 64.4 30.5 L 53.6 34.7 L 84 41.8 L 84 11.2 L 74.2 21.1 C 67.1 10.7 56.3 4 44 4 Z"
        fill="#0066FF"
      />
      {/* Dynamic G Arrow Head Inside */}
      <path
        d="M 28 68 L 61 35 L 51.5 35 L 51.5 25.5 L 80 25.5 L 80 54 L 70.5 54 L 70.5 44.5 L 37.5 77.5 Z"
        fill="#0066FF"
      />
      {/* R Element (Green Top Bar, Yellow Loop, Red Diagonal Leg) */}
      <rect x="94" y="4" width="44" height="15" rx="5" fill="#00A859" />
      <path
        d="M 124 4 C 136 4 146 14 146 26 C 146 38 136 46 124 46 L 103 46 L 103 32 L 124 32 C 127 32 130 29.5 130 26 C 130 22.5 127 19 124 19 L 94 19 L 94 4 Z"
        fill="#FFBA00"
      />
      <path d="M 106 42 L 141 84 L 122 84 L 92 48 Z" fill="#E53935" />
    </svg>
  )
}

export function BrandLogo({
  variant = 'horizontal',
  size = 'md',
  href,
  className = '',
  priority = false,
  showTagline = true,
  inverted = false,
}: BrandLogoProps) {
  const pixelHeight = sizeHeights[size]

  let content: React.ReactNode

  if (variant === 'raster') {
    content = (
      <Image
        src="/images/Grovaitech_Logo_Optimized.png"
        alt="Grovaitech"
        width={pixelHeight * 3.5}
        height={pixelHeight}
        priority={priority}
        className={`h-auto max-h-[${pixelHeight}px] w-auto object-contain ${className}`}
      />
    )
  } else if (variant === 'symbol') {
    content = <BrandLogoSymbol size={pixelHeight} className={className} />
  } else if (variant === 'stacked') {
    content = (
      <div className={`flex flex-col items-center gap-1.5 ${className}`}>
        <BrandLogoSymbol size={pixelHeight * 0.9} />
        <span
          className={`font-black tracking-wider text-sm ${
            inverted ? 'text-white' : 'text-[#00142E]'
          }`}
        >
          GROVAITECH
        </span>
      </div>
    )
  } else {
    // Horizontal full lockup
    content = (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <BrandLogoSymbol size={pixelHeight * 0.78} />
        <div className="flex flex-col justify-center">
          <span
            className={`font-black text-base sm:text-lg leading-none tracking-tight ${
              inverted ? 'text-white' : 'text-[#00142E]'
            }`}
          >
            GROVAITECH
          </span>
          {showTagline && size !== 'xs' && (
            <span
              className={`text-[8px] sm:text-[9px] font-semibold tracking-tight mt-0.5 leading-tight ${
                inverted ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              We Don&apos;t Sell Software. We Deploy AI Employees.
            </span>
          )}
        </div>
      </div>
    )
  }

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-0.5 transition-opacity hover:opacity-90 min-h-[44px]"
        aria-label="Grovaitech Home"
      >
        {content}
      </Link>
    )
  }

  return content
}

export default BrandLogo
