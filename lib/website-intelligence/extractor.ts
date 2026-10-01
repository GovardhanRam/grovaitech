/**
 * Grovaitech AI Platform
 * lib/website-intelligence/extractor.ts
 *
 * Evidence-first extractor that transforms raw parsed HTML documents into
 * structured WebsitePage representations and factual WebsiteEvidenceItems.
 *
 * Principles:
 * - Evidence First: Factual observations only. Never claims "Your website is bad".
 * - Explicit Statuses: FOUND, NOT_FOUND, UNKNOWN, FETCH_FAILED.
 * - Zero Hallucinations: Does not infer unobserved services, pricing, or credentials.
 */

import type {
  WebsitePage,
  WebsiteEvidenceItem,
  WebsiteLink,
  WebsiteForm,
  WebsiteCtaSignal,
  WebsiteContactSignal,
  WebsiteImage,
  WebsiteStructuredDataPresence,
  EvidenceProvenance,
} from './types'
import type { RawParsedDocument } from './parser'

const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

const COMMON_CTA_WORDS = [
  'book',
  'schedule',
  'appointment',
  'consultation',
  'contact',
  'call',
  'get started',
  'inquire',
  'enquire',
  'reserve',
  'quote',
  'whatsapp',
  'chat',
  'reach out',
  'visit us',
]

/**
 * Normalizes detected phone numbers to strip extraneous characters.
 */
function cleanPhoneNumber(raw: string): string {
  return raw.trim().replace(/[^\d+]/g, '')
}

/**
 * Extracts itemized services from metadata (meta description, page title).
 */
export function extractServicesFromMetadata(metaDescription?: string, title?: string): string[] {
  const services: string[] = []
  if (!metaDescription && !title) return services

  const text = metaDescription || ''
  const match = /(?:for|specializing in|specialises in|offers|services include)\s+([^.]+)/i.exec(text)
  if (match) {
    const rawList = match[1]
    const parts = rawList
      .split(/[,&;•|]|\band\b/i)
      .map((s) => s.trim().replace(/^[\s-–—]+/, ''))
      .filter((s) => s.length > 2 && s.length < 45 && !/more|etc|all|best|top/i.test(s))

    for (const part of parts) {
      const formatted = part.replace(/\b\w/g, (c) => c.toUpperCase())
      if (!services.includes(formatted)) {
        services.push(formatted)
      }
    }
  }

  return services
}

/**
 * Extracts geographic location candidates from page title or meta description.
 */
export function extractLocationFromMetadata(metaDescription?: string, title?: string): string | undefined {
  const text = `${title || ''}. ${metaDescription || ''}`
  const match = /(?:in|at|serving|located in)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/.exec(text)
  if (match && match[1]) {
    const candidate = match[1].trim()
    if (!/^(Best|High|Top|Quality|Modern|Our|The|Leading|Award)$/i.test(candidate)) {
      return candidate
    }
  }
  return undefined
}

/**
 * Extracts structured WebsitePage and evidence items from a parsed HTML document.
 */
export function extractPageEvidence(
  doc: RawParsedDocument,
  pageUrl: string,
  statusCode: number = 200,
  contentType: string = 'text/html',
  responseTimeMs: number = 0,
  bundleContent?: string
): { page: WebsitePage; evidence: WebsiteEvidenceItem[] } {
  let baseOrigin: string
  let pathname = '/'
  try {
    const parsedUrl = new URL(pageUrl)
    baseOrigin = parsedUrl.origin
    pathname = parsedUrl.pathname || '/'
  } catch {
    baseOrigin = ''
  }

  // 1. Links categorization (internal vs external vs nav)
  const internalLinks: WebsiteLink[] = []
  const externalLinks: WebsiteLink[] = []
  const navigationLinks: WebsiteLink[] = []

  for (const rawLink of doc.links) {
    let isExternal = false
    try {
      const linkUrl = new URL(rawLink.href, pageUrl)
      isExternal = Boolean(baseOrigin && linkUrl.origin !== baseOrigin)
    } catch {
      isExternal = false
    }

    const linkItem: WebsiteLink = {
      href: rawLink.href,
      text: rawLink.text,
      isExternal,
      isNav: rawLink.rawAttrs['role'] === 'menuitem' || rawLink.rawAttrs['class']?.includes('nav'),
    }

    if (isExternal) {
      externalLinks.push(linkItem)
    } else {
      internalLinks.push(linkItem)
    }

    if (linkItem.isNav) {
      navigationLinks.push(linkItem)
    }
  }

  // 2. Forms analysis
  const forms: WebsiteForm[] = doc.forms.map((f) => {
    const hasEmailField = f.inputs.some(
      (inp) => inp.type === 'email' || (inp.name && /email/i.test(inp.name))
    )
    const hasPhoneField = f.inputs.some(
      (inp) =>
        inp.type === 'tel' ||
        (inp.name && /phone|mobile|tel|contact/i.test(inp.name))
    )

    return {
      action: f.action,
      method: f.method,
      inputs: f.inputs,
      submitButtonText: f.submitText,
      hasEmailField,
      hasPhoneField,
    }
  })

  // 3. Contacts & Channels
  const contacts: WebsiteContactSignal[] = []
  const seenContacts = new Set<string>()

  // A. Phone numbers from tel: links
  for (const link of doc.links) {
    if (link.href.startsWith('tel:')) {
      const num = cleanPhoneNumber(link.href.replace('tel:', ''))
      if (num && !seenContacts.has(num)) {
        seenContacts.add(num)
        contacts.push({ type: 'phone', value: num, rawSource: link.href })
      }
    }
    // B. WhatsApp links
    if (
      link.href.includes('wa.me/') ||
      link.href.includes('api.whatsapp.com/send')
    ) {
      if (!seenContacts.has(link.href)) {
        seenContacts.add(link.href)
        contacts.push({ type: 'whatsapp', value: link.href, rawSource: link.href })
      }
    }
    // C. Mailto links
    if (link.href.startsWith('mailto:')) {
      const email = link.href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
      if (email && !seenContacts.has(email)) {
        seenContacts.add(email)
        contacts.push({ type: 'email', value: email, rawSource: link.href })
      }
    }
  }

  // Text-based fallback email extraction
  const foundEmails = doc.cleanTextContent.match(EMAIL_REGEX) || []
  for (const em of foundEmails) {
    const normalized = em.trim().toLowerCase()
    if (!seenContacts.has(normalized)) {
      seenContacts.add(normalized)
      contacts.push({ type: 'email', value: normalized, rawSource: 'body_text' })
    }
  }

  // Text-based phone extraction
  const foundPhones = doc.cleanTextContent.match(PHONE_REGEX) || []
  for (const ph of foundPhones) {
    const cleaned = cleanPhoneNumber(ph)
    if (cleaned.length >= 7 && cleaned.length <= 15 && !seenContacts.has(cleaned)) {
      seenContacts.add(cleaned)
      contacts.push({ type: 'phone', value: cleaned, rawSource: 'body_text' })
    }
  }

  // Safe same-origin primary bundle extraction (when present for SPA or dynamic applications)
  const discoveredRoutes: string[] = []
  if (bundleContent) {
    // 1. Tel: links from bundle
    const telMatches = bundleContent.match(/tel:[^"'\\s<>)]+/g) || []
    for (const rawTel of telMatches) {
      const num = cleanPhoneNumber(rawTel.replace('tel:', ''))
      if (num && num.length >= 8 && num.length <= 15 && !seenContacts.has(num)) {
        seenContacts.add(num)
        contacts.push({ type: 'phone', value: num, rawSource: 'same_origin_bundle' })
      }
    }

    // 2. Explicit phone patterns from bundle (e.g. +91 89194 57887 or mobile patterns)
    const phoneMatches = bundleContent.match(/(?:\+91[-.\s]?)?[6-9]\d{9}/g) || []
    for (const ph of phoneMatches) {
      const cleaned = cleanPhoneNumber(ph)
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 15 &&
        !/^(\d)\1+$/.test(cleaned) &&
        !seenContacts.has(cleaned)
      ) {
        seenContacts.add(cleaned)
        contacts.push({ type: 'phone', value: cleaned, rawSource: 'same_origin_bundle' })
      }
    }

    // 3. WhatsApp click-to-chat links
    const waMatches =
      bundleContent.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?(?:phone=)?)[^"'\\s<>)]+/g) || []
    for (const wa of waMatches) {
      const fullWa = wa.startsWith('http') ? wa : `https://${wa}`
      if (!seenContacts.has(fullWa)) {
        seenContacts.add(fullWa)
        contacts.push({ type: 'whatsapp', value: fullWa, rawSource: 'same_origin_bundle' })
      }
    }

    // 4. Mailto and emails
    const mailtoMatches = bundleContent.match(/mailto:[^"'\\s<>)]+/g) || []
    for (const rawMail of mailtoMatches) {
      const email = rawMail.replace('mailto:', '').split('?')[0].trim().toLowerCase()
      if (email && email.includes('@') && !seenContacts.has(email)) {
        seenContacts.add(email)
        contacts.push({ type: 'email', value: email, rawSource: 'same_origin_bundle' })
      }
    }

    const emailMatches =
      bundleContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
    for (const em of emailMatches) {
      const normalized = em.trim().toLowerCase()
      if (
        !normalized.includes('vite') &&
        !normalized.includes('babel') &&
        !normalized.includes('example.com') &&
        !normalized.endsWith('.png') &&
        !normalized.endsWith('.jpg') &&
        !seenContacts.has(normalized)
      ) {
        seenContacts.add(normalized)
        contacts.push({ type: 'email', value: normalized, rawSource: 'same_origin_bundle' })
      }
    }

    // 5. Internal routes
    const routeMatches =
      bundleContent.match(
        /["'](\/(?:about|services|contact|doctors|gallery|blog|reviews|team|pricing|faq)[a-zA-Z0-9_\/-]*)["']/gi
      ) || []
    for (const r of routeMatches) {
      const cleanRoute = r.replace(/["']/g, '').trim()
      if (cleanRoute.startsWith('/') && !discoveredRoutes.includes(cleanRoute)) {
        discoveredRoutes.push(cleanRoute)
      }
    }
  }

  // 4. CTA Buttons & Links
  const buttons: WebsiteCtaSignal[] = []
  const seenCtas = new Set<string>()

  for (const btn of doc.buttons) {
    const textLower = btn.text.toLowerCase()
    const isBookingCta = /book|schedule|appointment|consultation/i.test(textLower)
    const isPhoneCta = /call|phone/i.test(textLower)
    const isWhatsAppCta = /whatsapp|chat/i.test(textLower)

    const key = `btn:${btn.text}`
    if (!seenCtas.has(key)) {
      seenCtas.add(key)
      buttons.push({
        text: btn.text,
        type: 'button',
        isPhoneCta,
        isWhatsAppCta,
        isBookingCta,
      })
    }
  }

  // Check links that look like action CTAs
  for (const link of doc.links) {
    const textLower = link.text.toLowerCase()
    const hasCtaWord = COMMON_CTA_WORDS.some((word) => textLower.includes(word))
    const isPhoneLink = link.href.startsWith('tel:')
    const isWhatsAppLink = link.href.includes('wa.me') || link.href.includes('api.whatsapp.com')

    if ((hasCtaWord && link.text.length < 50) || isPhoneLink || isWhatsAppLink) {
      const key = `link:${link.text || link.href}`
      if (!seenCtas.has(key)) {
        seenCtas.add(key)
        buttons.push({
          text: link.text || (isPhoneLink ? 'Call Us' : 'WhatsApp Us'),
          type: 'link',
          href: link.href,
          isPhoneCta: isPhoneLink || /call|phone/i.test(textLower),
          isWhatsAppCta: isWhatsAppLink || /whatsapp/i.test(textLower),
          isBookingCta: /book|schedule|appointment|consultation/i.test(textLower),
        })
      }
    }
  }

  // 5. Images analysis
  const images: WebsiteImage[] = doc.images.map((img) => ({
    src: img.src,
    alt: img.alt,
    hasAlt: Boolean(img.alt && img.alt.length > 0),
  }))

  // 6. Structured data analysis
  const detectedTypes: string[] = []
  for (const scriptContent of doc.jsonLdScripts) {
    try {
      const parsed = JSON.parse(scriptContent)
      if (parsed['@type']) {
        if (Array.isArray(parsed['@type'])) {
          detectedTypes.push(...parsed['@type'])
        } else {
          detectedTypes.push(String(parsed['@type']))
        }
      }
      if (Array.isArray(parsed['@graph'])) {
        for (const item of parsed['@graph']) {
          if (item['@type']) detectedTypes.push(String(item['@type']))
        }
      }
    } catch {
      // Ignored: malformed JSON-LD script
    }
  }

  const structuredData: WebsiteStructuredDataPresence = {
    hasJsonLd: doc.jsonLdScripts.length > 0,
    hasOpenGraph: Object.keys(doc.openGraphTags).length > 0,
    hasMicrodata: doc.hasMicrodata,
    detectedTypes: Array.from(new Set(detectedTypes)),
  }

  // Build the WebsitePage
  const page: WebsitePage = {
    url: pageUrl,
    pathname,
    statusCode,
    contentType,
    responseTimeMs,
    title: doc.title,
    metaDescription: doc.metaDescription,
    canonicalUrl: doc.canonicalUrl,
    language: doc.language,
    hasMobileViewport: doc.hasViewportMeta,
    headings: doc.headings,
    navigationLinks,
    internalLinks,
    externalLinks,
    forms,
    buttons,
    contacts,
    images,
    structuredData,
    rawTextSnippet: doc.cleanTextContent.slice(0, 1500),
    isSpaShell: doc.isSpaShell,
    spaFramework: doc.spaFramework,
    discoveredRoutes,
  }

  // 7. Generate Factual WebsiteEvidenceItems
  const evidence: WebsiteEvidenceItem[] = []

  // Title
  if (doc.title) {
    evidence.push({
      id: `ev-title-${pathname}`,
      type: 'title',
      page: pathname,
      value: doc.title,
      status: 'FOUND',
      provenance: 'meta',
      detail: `Page title tag detected (${doc.title.length} characters).`,
    })
  } else {
    evidence.push({
      id: `ev-title-${pathname}`,
      type: 'title',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No <title> tag detected in HTML header.',
    })
  }

  // Meta Description
  if (doc.metaDescription) {
    evidence.push({
      id: `ev-meta-${pathname}`,
      type: 'meta_description',
      page: pathname,
      value: doc.metaDescription,
      status: 'FOUND',
      provenance: 'meta',
      detail: `Meta description detected (${doc.metaDescription.length} characters).`,
    })
  } else {
    evidence.push({
      id: `ev-meta-${pathname}`,
      type: 'meta_description',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No meta description or og:description detected.',
    })
  }

  // Canonical URL
  if (doc.canonicalUrl) {
    evidence.push({
      id: `ev-canon-${pathname}`,
      type: 'canonical_url',
      page: pathname,
      value: doc.canonicalUrl,
      status: 'FOUND',
      provenance: 'static_html',
      detail: `Canonical link tag detected: ${doc.canonicalUrl}`,
    })
  } else {
    evidence.push({
      id: `ev-canon-${pathname}`,
      type: 'canonical_url',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No canonical link element detected.',
    })
  }

  // Mobile Viewport
  evidence.push({
    id: `ev-viewport-${pathname}`,
    type: 'mobile_viewport',
    page: pathname,
    status: doc.hasViewportMeta ? 'FOUND' : 'NOT_FOUND',
    provenance: 'meta',
    detail: doc.hasViewportMeta
      ? 'Mobile viewport meta tag is present.'
      : 'No viewport meta tag detected; mobile responsiveness may be impaired.',
  })

  // Headings
  const h1s = doc.headings.filter((h) => h.level === 1)
  if (h1s.length > 0) {
    evidence.push({
      id: `ev-h1-${pathname}`,
      type: 'h1_heading',
      page: pathname,
      value: h1s[0].text,
      status: 'FOUND',
      provenance: 'static_html',
      sample_values: h1s.map((h) => h.text),
      detail: `${h1s.length} H1 heading(s) detected.`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-h1-${pathname}`,
      type: 'h1_heading',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). H1 heading is generated dynamically via JavaScript in browser runtime.',
    })
  } else {
    evidence.push({
      id: `ev-h1-${pathname}`,
      type: 'h1_heading',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No H1 main heading detected on this page.',
    })
  }

  const h2s = doc.headings.filter((h) => h.level === 2)
  if (h2s.length > 0) {
    evidence.push({
      id: `ev-h2-${pathname}`,
      type: 'h2_heading',
      page: pathname,
      status: 'FOUND',
      provenance: 'static_html',
      sample_values: h2s.slice(0, 5).map((h) => h.text),
      detail: `${h2s.length} H2 subheadings detected.`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-h2-${pathname}`,
      type: 'h2_heading',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Section subheadings are rendered dynamically via JavaScript.',
    })
  }

  // CTAs
  if (buttons.length > 0) {
    evidence.push({
      id: `ev-cta-${pathname}`,
      type: 'cta_signal',
      page: pathname,
      status: 'FOUND',
      provenance: 'static_html',
      sample_values: buttons.slice(0, 5).map((b) => b.text),
      detail: `${buttons.length} call-to-action button(s) or link(s) detected.`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-cta-${pathname}`,
      type: 'cta_signal',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Interactive calls-to-action and booking triggers are rendered dynamically in browser runtime.',
    })
  } else {
    evidence.push({
      id: `ev-cta-${pathname}`,
      type: 'cta_signal',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No prominent CTA buttons or booking links detected.',
    })
  }

  // Lead Forms
  if (forms.length > 0) {
    const leadForms = forms.filter((f) => f.hasEmailField || f.hasPhoneField)
    evidence.push({
      id: `ev-form-${pathname}`,
      type: 'lead_capture_form',
      page: pathname,
      status: leadForms.length > 0 ? 'FOUND' : 'NOT_FOUND',
      provenance: 'static_html',
      detail:
        leadForms.length > 0
          ? `${leadForms.length} interactive lead capture form(s) detected with email/phone inputs.`
          : `${forms.length} form(s) detected, but without explicit contact capture fields.`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-form-${pathname}`,
      type: 'lead_capture_form',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Interactive forms and booking modals are initialized dynamically via client-side components.',
    })
  } else {
    evidence.push({
      id: `ev-form-${pathname}`,
      type: 'lead_capture_form',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No interactive lead capture forms detected on page.',
    })
  }

  // Phone Contacts
  const phoneContacts = contacts.filter((c) => c.type === 'phone')
  if (phoneContacts.length > 0) {
    const isBundle = phoneContacts.some((c) => c.rawSource === 'same_origin_bundle')
    evidence.push({
      id: `ev-phone-${pathname}`,
      type: 'phone_contact',
      page: pathname,
      value: phoneContacts[0].value,
      status: 'FOUND',
      provenance: isBundle ? 'same_origin_bundle' : 'static_html',
      sample_values: phoneContacts.map((c) => c.value),
      detail: isBundle
        ? `Telephone contact signal verified in same-origin application bundle (${phoneContacts.map((c) => c.value).join(', ')}).`
        : `Telephone contact number(s) detected: ${phoneContacts.map((c) => c.value).join(', ')}`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-phone-${pathname}`,
      type: 'phone_contact',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Visible contact triggers are rendered dynamically in browser runtime.',
    })
  } else {
    evidence.push({
      id: `ev-phone-${pathname}`,
      type: 'phone_contact',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No visible telephone number or tel: link detected.',
    })
  }

  // Email Contacts
  const emailContacts = contacts.filter((c) => c.type === 'email')
  if (emailContacts.length > 0) {
    const isBundle = emailContacts.some((c) => c.rawSource === 'same_origin_bundle')
    evidence.push({
      id: `ev-email-${pathname}`,
      type: 'email_contact',
      page: pathname,
      value: emailContacts[0].value,
      status: 'FOUND',
      provenance: isBundle ? 'same_origin_bundle' : 'static_html',
      sample_values: emailContacts.map((c) => c.value),
      detail: isBundle
        ? `Email contact address verified in same-origin application bundle (${emailContacts.map((c) => c.value).join(', ')}).`
        : `Email address(es) detected: ${emailContacts.map((c) => c.value).join(', ')}`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-email-${pathname}`,
      type: 'email_contact',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Email contact triggers are rendered dynamically in browser runtime.',
    })
  } else {
    evidence.push({
      id: `ev-email-${pathname}`,
      type: 'email_contact',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No visible email address or mailto: link detected.',
    })
  }

  // WhatsApp Contacts
  const waContacts = contacts.filter((c) => c.type === 'whatsapp')
  if (waContacts.length > 0) {
    const isBundle = waContacts.some((c) => c.rawSource === 'same_origin_bundle')
    evidence.push({
      id: `ev-wa-${pathname}`,
      type: 'whatsapp_contact',
      page: pathname,
      status: 'FOUND',
      provenance: isBundle ? 'same_origin_bundle' : 'static_html',
      value: waContacts[0].value,
      detail: isBundle
        ? `WhatsApp direct link verified in same-origin application bundle (${waContacts[0].value}).`
        : `WhatsApp direct link detected (${waContacts[0].value}).`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-wa-${pathname}`,
      type: 'whatsapp_contact',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Direct messaging integrations are rendered dynamically in browser runtime.',
    })
  } else {
    evidence.push({
      id: `ev-wa-${pathname}`,
      type: 'whatsapp_contact',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No direct WhatsApp click-to-chat integration detected.',
    })
  }

  // Images and Alt Coverage
  if (images.length > 0) {
    const withAlt = images.filter((i) => i.hasAlt).length
    evidence.push({
      id: `ev-img-${pathname}`,
      type: 'image_alt_coverage',
      page: pathname,
      status: withAlt === images.length ? 'FOUND' : 'NOT_FOUND',
      provenance: 'static_html',
      value: `${withAlt}/${images.length} images have alt text`,
      detail: `${withAlt} of ${images.length} image(s) specify descriptive alt text.`,
    })
  } else if (doc.isSpaShell) {
    evidence.push({
      id: `ev-img-${pathname}`,
      type: 'image_alt_coverage',
      page: pathname,
      status: 'UNKNOWN',
      detail:
        'Dynamic client-side rendered element (SPA shell). Media images and graphics are mounted dynamically in the client DOM.',
    })
  }

  // Structured Data
  if (structuredData.hasJsonLd || structuredData.hasMicrodata) {
    evidence.push({
      id: `ev-schema-${pathname}`,
      type: 'structured_data',
      page: pathname,
      status: 'FOUND',
      provenance: structuredData.hasJsonLd ? 'json_ld' : 'static_html',
      sample_values: structuredData.detectedTypes,
      detail: `Structured Schema markup detected: ${structuredData.detectedTypes.join(', ') || 'Schema block present'}`,
    })
  } else {
    evidence.push({
      id: `ev-schema-${pathname}`,
      type: 'structured_data',
      page: pathname,
      status: 'NOT_FOUND',
      detail: 'No Schema.org (JSON-LD or Microdata) structured data markup detected.',
    })
  }

  return { page, evidence }
}

/**
 * Enriches WebsiteUpgradeInput with factual evidence discovered during live crawl.
 */
export function enrichInputWithCrawlResult<T extends {
  url?: string
  current_description?: string
  current_services?: string[]
  contact_phone?: string
  contact_email?: string
  location?: string
  raw_site_text?: string
  supplied_evidence?: any[]
  crawl_summary?: any
}>(
  input: T,
  crawl: {
    startingUrl: string
    finalBaseUrl?: string
    pages: Array<{ rawTextSnippet: string }>
    allEvidence: WebsiteEvidenceItem[]
    summary: {
      totalPagesCrawled: number
      phoneNumbers: string[]
      emailAddresses: string[]
      detectedServices: string[]
      detectedDescription?: string
      detectedLocation?: string
      isSpaShell?: boolean
      spaFramework?: string
      discoveredRoutes?: string[]
    }
  }
): T {
  const crawlEvidence: any[] = []

  for (const ev of crawl.allEvidence) {
    if (ev.status === 'FOUND' && ev.detail) {
      crawlEvidence.push({
        id: `crawl-ev-${ev.type}-${ev.page.replace(/[^a-zA-Z0-9]/g, '_')}`,
        fact: ev.detail,
        source: 'website_content',
        source_reference: `${crawl.startingUrl}${ev.page}`,
        verified_at: new Date().toISOString(),
        raw_text: ev.value,
      })
    }
  }

  const combinedRawText = crawl.pages.map((p) => p.rawTextSnippet).filter(Boolean).join('\n\n')

  return {
    ...input,
    url: crawl.finalBaseUrl || input.url,
    current_description: input.current_description || crawl.summary.detectedDescription,
    location: input.location || crawl.summary.detectedLocation,
    current_services:
      input.current_services && input.current_services.length > 0
        ? input.current_services
        : crawl.summary.detectedServices,
    contact_phone: input.contact_phone || crawl.summary.phoneNumbers[0],
    contact_email: input.contact_email || crawl.summary.emailAddresses[0],
    raw_site_text: input.raw_site_text
      ? `${input.raw_site_text}\n\n${combinedRawText}`
      : combinedRawText,
    supplied_evidence: [
      ...(input.supplied_evidence || []),
      ...crawlEvidence,
    ],
    crawl_summary: crawl.summary,
  }
}
