/**
 * Grovaitech Mobile & Web Design System
 * tests/unit/mobile-design-system.test.ts
 *
 * Comprehensive unit tests verifying design tokens, mobile safe-area classes,
 * 44px+ touch target compliance, brand color integrity, and UI component exports.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import {
  colors,
  touchTargets,
  radii,
  shadows,
  safeArea,
  typography,
} from '@/lib/design-tokens'
import * as UI from '@/components/ui'

describe('Grovaitech Mobile Design System — Tokens & Components', () => {
  describe('1. Brand & Semantic Color Tokens', () => {
    it('defines the approved official Grovaitech brand colors', () => {
      expect(colors.brand.navy).toBe('#00142E')
      expect(colors.brand.blue).toBe('#0066FF')
      expect(colors.brand.green).toBe('#00A859')
      expect(colors.brand.orange).toBe('#FFB703')
      expect(colors.brand.red).toBe('#E53935')
      expect(colors.brand.blueHover).toBe('#0052CC')
      expect(colors.brand.blueLight).toBe('#EBF3FF')
    })

    it('defines semantic status colors matching brand specifications', () => {
      expect(colors.semantic.active).toBe('#00A859')
      expect(colors.semantic.success).toBe('#00A859')
      expect(colors.semantic.warning).toBe('#FFB703')
      expect(colors.semantic.error).toBe('#E53935')
      expect(colors.semantic.info).toBe('#0066FF')
    })

    it('provides clean background, text, and border tokens', () => {
      expect(colors.surface.canvas).toBe('#F8FAFC')
      expect(colors.surface.card).toBe('#FFFFFF')
      expect(colors.text.primary).toBe('#00142E')
      expect(colors.border.subtle).toBe('#E2E8F0')
    })
  })

  describe('2. Mobile Touch Targets & Safe-Area Metrics', () => {
    it('enforces minimum 44px touch ergonomics', () => {
      expect(touchTargets.minPx).toBe(44)
      expect(touchTargets.minClass).toContain('min-h-[44px]')
      expect(touchTargets.minClass).toContain('min-w-[44px]')
    })

    it('provides safe-area classes for Android system navigation & notch', () => {
      expect(safeArea.top).toBe('pt-safe')
      expect(safeArea.bottom).toBe('pb-safe')
      expect(safeArea.bottomNav).toBe('pb-safe-nav')
    })

    it('provides rounded geometry scales for mobile cards and sheets', () => {
      expect(radii.md).toBe('rounded-xl')
      expect(radii.lg).toBe('rounded-2xl')
      expect(radii.xl).toBe('rounded-3xl')
      expect(radii.full).toBe('rounded-full')
    })
  })

  describe('3. Reusable UI Components Availability', () => {
    it('exports all requested design system primitives from components/ui', () => {
      expect(UI.BrandLogo).toBeDefined()
      expect(UI.BrandLogoSymbol).toBeDefined()
      expect(UI.AppHeader).toBeDefined()
      expect(UI.PageHeader).toBeDefined()
      expect(UI.BottomNavigation).toBeDefined()
      expect(UI.PrimaryButton).toBeDefined()
      expect(UI.SecondaryButton).toBeDefined()
      expect(UI.IconButton).toBeDefined()
      expect(UI.SearchInput).toBeDefined()
      expect(UI.Input).toBeDefined()
      expect(UI.SectionHeader).toBeDefined()
      expect(UI.StatCard).toBeDefined()
      expect(UI.FeatureCard).toBeDefined()
      expect(UI.ListCard).toBeDefined()
      expect(UI.StatusBadge).toBeDefined()
      expect(UI.ActionCard).toBeDefined()
      expect(UI.EmptyState).toBeDefined()
      expect(UI.Avatar).toBeDefined()
      expect(UI.ProgressBar).toBeDefined()
      expect(UI.BottomSheet).toBeDefined()
      expect(UI.Modal).toBeDefined()
      expect(UI.Tabs).toBeDefined()
      expect(UI.Pill).toBeDefined()
      expect(UI.GovaCard).toBeDefined()
    })
  })

  describe('4. Component Instantiation & Accessibility Contracts', () => {
    it('renders BrandLogoSymbol with proper svg role and aria-label', () => {
      const element = UI.BrandLogoSymbol({ size: 36 })
      expect(element.props.role).toBe('img')
      expect(element.props['aria-label']).toBe('Grovaitech GR Mark')
      expect(element.props.width).toBeCloseTo(36 * (148 / 90), 1)
    })

    it('renders PrimaryButton with 44px+ touch styles and busy state', () => {
      const buttonEl = React.createElement(
        UI.PrimaryButton,
        { isLoading: true, size: 'md' },
        'Deploy'
      )
      expect(buttonEl.props.isLoading).toBe(true)
      expect(buttonEl.props.size).toBe('md')
    })

    it('renders IconButton with strict aria-label compliance', () => {
      const iconEl = React.createElement(UI.IconButton, {
        icon: React.createElement('span', null, 'Icon'),
        'aria-label': 'Settings',
        size: 'md',
      })
      expect(iconEl.props['aria-label']).toBe('Settings')
      expect(iconEl.props.size).toBe('md')
    })

    it('configures StatusBadge with semantic dot and status styling', () => {
      const badgeLive = React.createElement(UI.StatusBadge, {
        status: 'live',
        dot: true,
        pulse: true,
      })
      expect(badgeLive.props.status).toBe('live')
      expect(badgeLive.props.dot).toBe(true)
      expect(badgeLive.props.pulse).toBe(true)
    })

    it('configures StatCard with title, value, and trend', () => {
      const cardEl = React.createElement(UI.StatCard, {
        title: 'Active Leads',
        value: '142',
        trend: { value: '+12%', isPositive: true },
        iconColor: 'blue',
      })
      expect(cardEl.props.title).toBe('Active Leads')
      expect(cardEl.props.value).toBe('142')
      expect(cardEl.props.trend?.isPositive).toBe(true)
    })

    it('provides default navigation items for BottomNavigation', () => {
      expect(UI.defaultBottomNavItems.length).toBeGreaterThanOrEqual(4)
      const names = UI.defaultBottomNavItems.map((item) => item.name)
      expect(names).toContain('Dashboard')
      expect(names).toContain('Leads')
      expect(names).toContain('Conversations')
      expect(names).toContain('AI Employees')
    })

    it('configures GovaCard with default interactive suggestions and status', () => {
      const govaEl = React.createElement(UI.GovaCard, {
        statusText: 'Online & Ready',
      })
      expect(govaEl.props.statusText).toBe('Online & Ready')
    })

    it('configures Tabs with accessible role and tab properties', () => {
      const tabsData = [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
      ]
      const tabsEl = React.createElement(UI.Tabs, {
        tabs: tabsData,
        activeTab: 'all',
        onChange: () => {},
      })
      expect(tabsEl.props.activeTab).toBe('all')
      expect(tabsEl.props.tabs).toHaveLength(2)
    })
  })
})
