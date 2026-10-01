/**
 * Grovaitech AI Platform
 * lib/website-intelligence/types.ts
 *
 * Core domain types and interfaces for the Live Website Intelligence layer.
 * Strictly evidence-backed, factual, non-judgmental, and strongly typed.
 */

export type EvidenceDetectionStatus = 'FOUND' | 'NOT_FOUND' | 'UNKNOWN' | 'FETCH_FAILED'

export interface WebsiteHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface WebsiteLink {
  href: string
  text: string
  isExternal: boolean
  isNav?: boolean
}

export interface FormInputField {
  name?: string
  type?: string
  placeholder?: string
  required?: boolean
}

export interface WebsiteForm {
  action?: string
  method?: string
  inputs: FormInputField[]
  submitButtonText?: string
  hasEmailField: boolean
  hasPhoneField: boolean
}

export interface WebsiteCtaSignal {
  text: string
  type: 'button' | 'link' | 'submit'
  href?: string
  isPhoneCta: boolean
  isWhatsAppCta: boolean
  isBookingCta: boolean
}

export interface WebsiteContactSignal {
  type: 'phone' | 'email' | 'whatsapp' | 'address' | 'social'
  value: string
  rawSource?: string
}

export interface WebsiteImage {
  src: string
  alt: string
  hasAlt: boolean
}

export interface WebsiteStructuredDataPresence {
  hasJsonLd: boolean
  hasOpenGraph: boolean
  hasMicrodata: boolean
  detectedTypes: string[]
}

export interface WebsitePage {
  url: string
  pathname: string
  statusCode: number
  contentType: string
  responseTimeMs: number
  title?: string
  metaDescription?: string
  canonicalUrl?: string
  language?: string
  hasMobileViewport: boolean
  headings: WebsiteHeading[]
  navigationLinks: WebsiteLink[]
  internalLinks: WebsiteLink[]
  externalLinks: WebsiteLink[]
  forms: WebsiteForm[]
  buttons: WebsiteCtaSignal[]
  contacts: WebsiteContactSignal[]
  images: WebsiteImage[]
  structuredData: WebsiteStructuredDataPresence
  rawTextSnippet: string
  isSpaShell?: boolean
  spaFramework?: string
  discoveredRoutes?: string[]
}

export type EvidenceProvenance =
  | 'static_html'
  | 'meta'
  | 'json_ld'
  | 'same_origin_bundle'
  | 'noscript'

export type WebsiteEvidenceType =
  | 'title'
  | 'meta_description'
  | 'canonical_url'
  | 'language'
  | 'mobile_viewport'
  | 'h1_heading'
  | 'h2_heading'
  | 'navigation_menu'
  | 'internal_link_structure'
  | 'cta_signal'
  | 'lead_capture_form'
  | 'phone_contact'
  | 'email_contact'
  | 'whatsapp_contact'
  | 'image_alt_coverage'
  | 'structured_data'
  | 'page_speed_timing'

export interface WebsiteEvidenceItem {
  id: string
  type: WebsiteEvidenceType
  page: string
  value?: string
  status: EvidenceDetectionStatus
  provenance?: EvidenceProvenance
  detail?: string
  sample_values?: string[]
}

export interface WebsiteCrawlLimits {
  /** Maximum time allowed for an individual HTTP request in ms (default: 8000, max: 15000) */
  timeoutMs: number
  /** Maximum allowed HTTP response body size in bytes (default: 2MB = 2097152) */
  maxResponseBytes: number
  /** Maximum number of same-origin pages to crawl (default: 3, max: 10) */
  maxPages: number
  /** Maximum crawl depth from root URL (default: 1, max: 3) */
  maxCrawlDepth: number
  /** Maximum redirects allowed per request (default: 3) */
  maxRedirects: number
  /** Maximum HTML bytes to parse (default: 1MB = 1048576) */
  maxHtmlParseBytes: number
}

export interface WebsiteFetchResult {
  success: boolean
  url: string
  finalUrl?: string
  httpStatus?: number
  contentType?: string
  responseTimeMs?: number
  page?: WebsitePage
  evidence: WebsiteEvidenceItem[]
  error?: string
}

export interface CrawlErrorItem {
  url: string
  error: string
  statusCode?: number
}

export interface WebsiteCrawlSummary {
  totalPagesCrawled: number
  totalHeadingsFound: number
  totalFormsFound: number
  totalCtasFound: number
  phoneNumbers: string[]
  emailAddresses: string[]
  whatsappLinks: string[]
  detectedServices: string[]
  detectedTitle?: string
  detectedDescription?: string
  detectedBusinessName?: string
  detectedLocation?: string
  missingCriticalElements: string[]
  isSpaShell?: boolean
  spaFramework?: string
  discoveredRoutes?: string[]
}

export interface WebsiteCrawlResult {
  success: boolean
  startingUrl: string
  finalBaseUrl: string
  pages: WebsitePage[]
  allEvidence: WebsiteEvidenceItem[]
  summary: WebsiteCrawlSummary
  errors: CrawlErrorItem[]
  crawlDurationMs: number
}
