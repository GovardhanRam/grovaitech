/**
 * Grovaitech Mobile & Web Design Tokens
 * lib/design-tokens.ts
 *
 * Single source of truth for design tokens across Grovaitech UI.
 * Reflects the official Grovaitech brand colors, mobile-first touch ergonomics,
 * safe-area metrics, and typography hierarchies.
 */

export const colors = {
  brand: {
    navy: '#00142E',
    blue: '#0066FF',
    blueHover: '#0052CC',
    blueLight: '#EBF3FF',
    lavender: '#F3F4FF',
    green: '#00A859',
    orange: '#FFB703',
    red: '#E53935',
  },
  semantic: {
    active: '#00A859',
    success: '#00A859',
    warning: '#FFB703',
    error: '#E53935',
    info: '#0066FF',
    neutral: '#64748B',
  },
  surface: {
    canvas: '#F8FAFC',
    card: '#FFFFFF',
    muted: '#F1F5F9',
    subtle: '#F8FAFC',
    highlight: '#EBF3FF',
  },
  text: {
    primary: '#00142E',
    secondary: '#475569',
    muted: '#64748B',
    white: '#FFFFFF',
    brand: '#0066FF',
  },
  border: {
    subtle: '#E2E8F0',
    hover: '#CBD5E1',
    active: '#0066FF',
    divider: '#F1F5F9',
  },
} as const

export const touchTargets = {
  minPx: 44,
  minClass: 'min-h-[44px] min-w-[44px]',
  touchClass: 'touch-target',
  buttonH: {
    sm: 'h-9 min-h-[44px] px-3',
    md: 'h-11 min-h-[44px] px-4',
    lg: 'h-13 min-h-[48px] px-6',
  },
} as const

export const radii = {
  xs: 'rounded',
  sm: 'rounded-md',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
} as const

export const shadows = {
  subtle: 'shadow-xs',
  card: 'shadow-soft-card',
  float: 'shadow-soft-float',
  drawer: 'shadow-[0_-4px_24px_rgba(0,20,46,0.08)]',
} as const

export const safeArea = {
  top: 'pt-safe',
  bottom: 'pb-safe',
  bottomNav: 'pb-safe-nav',
  left: 'pl-safe',
  right: 'pr-safe',
} as const

export const typography = {
  pageTitle: 'text-2xl sm:text-3xl font-extrabold text-[#00142E] tracking-tight leading-tight',
  sectionTitle: 'text-lg sm:text-xl font-bold text-[#00142E] tracking-tight',
  cardTitle: 'text-base font-bold text-[#00142E] leading-snug',
  body: 'text-sm text-slate-600 font-normal leading-relaxed',
  bodyEmphasis: 'text-sm text-[#00142E] font-medium leading-relaxed',
  caption: 'text-xs text-slate-500 font-medium',
  micro: 'text-[10px] font-bold uppercase tracking-wider',
} as const

export default {
  colors,
  touchTargets,
  radii,
  shadows,
  safeArea,
  typography,
}
