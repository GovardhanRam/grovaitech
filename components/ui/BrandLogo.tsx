'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/BrandLogo.tsx
 *
 * Official Grovaitech logo component using authentic master brand artwork:
 * - Master Square Emblem: public/images/Grovaitech_Logo_Optimized.png
 * - Master Horizontal Lockup: public/images/grovaitech-navbar-logo-240x84.png
 *
 * Preserves authentic brand colors without artificial color inversions.
 * On dark backgrounds, renders inside a clean high-contrast container.
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
  inverted?: boolean // for dark backgrounds
}

const sizeHeights: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 64,
}

/**
 * @deprecated Use BrandLogo component which renders the authentic master artwork.
 * Kept for backwards compatibility with existing contracts and unit tests.
 */
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

  if (variant === 'stacked' || variant === 'raster') {
    // Official Master Square Emblem Artwork
    const containerClasses = inverted
      ? 'bg-white rounded-xl p-1.5 shadow-md inline-flex items-center justify-center'
      : 'inline-flex items-center justify-center'

    content = (
      <div className={`${containerClasses} ${className}`}>
        <Image
          src="/images/Grovaitech_Logo_Optimized.png"
          alt="Grovaitech"
          width={pixelHeight * 2}
          height={pixelHeight * 2}
          priority={priority}
          className="h-auto max-h-[64px] w-auto object-contain"
          style={{ height: pixelHeight }}
        />
      </div>
    )
  } else if (variant === 'symbol') {
    // Compact symbol derived from authentic horizontal lockup (left GR mark)
    const symbolWidth = Math.round(pixelHeight * 1.05)
    const containerClasses = inverted
      ? 'bg-white/95 rounded-lg p-1 shadow-xs inline-flex items-center justify-center'
      : 'inline-flex items-center justify-center'

    content = (
      <div
        className={`relative overflow-hidden rounded-md ${containerClasses} ${className}`}
        style={{ height: pixelHeight, width: symbolWidth }}
      >
        <Image
          src="/images/grovaitech-navbar-logo-240x84.png"
          alt="Grovaitech"
          width={Math.round(pixelHeight * 3.5)}
          height={Math.round(pixelHeight * 1.6)}
          priority={priority}
          className="object-cover object-left h-full max-w-none"
        />
      </div>
    )
  } else {
    // variant === 'horizontal'
    // Intrinsic navbar artwork is 1024x471 (~2.17:1 ratio)
    if (showTagline) {
      // Full horizontal lockup including tagline
      const fullWidth = Math.round(pixelHeight * (1024 / 471))
      const containerClasses = inverted
        ? 'bg-white/95 rounded-lg px-2 py-1 shadow-xs inline-flex items-center'
        : 'inline-flex items-center'

      content = (
        <div className={`${containerClasses} ${className}`}>
          <Image
            src="/images/grovaitech-navbar-logo-240x84.png"
            alt="Grovaitech — We Don't Sell Software. We Deploy AI Employees."
            width={fullWidth}
            height={pixelHeight}
            priority={priority}
            className="w-auto object-contain"
            style={{ height: pixelHeight }}
          />
        </div>
      )
    } else {
      // Compact horizontal lockup without tagline (tagline in lower 30% is clipped)
      const compactWidth = Math.round(pixelHeight * 2.05)
      const containerClasses = inverted
        ? 'bg-white/95 rounded-lg px-2 py-0.5 shadow-xs inline-flex items-center'
        : 'inline-flex items-center'

      content = (
        <div
          className={`relative overflow-hidden ${containerClasses} ${className}`}
          style={{ height: pixelHeight, width: compactWidth }}
        >
          <Image
            src="/images/grovaitech-navbar-logo-240x84.png"
            alt="Grovaitech"
            width={Math.round(compactWidth * 1.15)}
            height={Math.round(pixelHeight * 1.45)}
            priority={priority}
            className="object-cover object-top w-full h-[145%]"
          />
        </div>
      )
    }
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
