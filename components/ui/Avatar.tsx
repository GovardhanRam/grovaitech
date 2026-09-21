'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/Avatar.tsx
 *
 * User and AI Employee avatar with fallback initials and optional online status dot.
 */

import React from 'react'
import Image from 'next/image'

export interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'busy' | 'away' | 'offline'
  variant?: 'circle' | 'rounded'
  className?: string
}

const sizeStyles = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const statusColors = {
  online: 'bg-[#00A859]',
  busy: 'bg-[#E53935]',
  away: 'bg-[#FFB703]',
  offline: 'bg-slate-400',
}

export function Avatar({
  name,
  src,
  size = 'md',
  status,
  variant = 'rounded',
  className = '',
}: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'G'

  const shapeClass = variant === 'circle' ? 'rounded-full' : 'rounded-xl'

  return (
    <div className={`relative inline-block shrink-0 ${sizeStyles[size]} ${className}`}>
      <div
        className={`w-full h-full ${shapeClass} overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs border border-white/20 select-none`}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${statusColors[status]}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
}

export default Avatar
