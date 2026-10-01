/**
 * Grovaitech AI Platform
 * tests/unit/website-intelligence.test.ts
 *
 * Comprehensive test suite for Live Website Intelligence:
 * - URL Security & SSRF Protection (Phase 10)
 * - Deterministic HTML Parsing & Evidence Extraction (Phase 11)
 * - Healthcare Clinic Local Fixture Extraction (Phase 12)
 * - Zero Hallucination & Fact Gating (Phase 13)
 * - End-to-End Website Upgrade Integration with Crawl Intelligence (Phase 8 & 14)
 */

import { describe, it, expect } from 'vitest'
import {
  validateUntrustedUrl,
  validateRedirectTarget,
  normalizeSameOriginCrawlUrl,
  parseHtmlDocument,
  extractPageEvidence,
  crawlWebsite,
  enrichInputWithCrawlResult,
  safeFetchSameOriginAsset,
  type WebsitePage,
  type WebsiteEvidenceItem,
} from '@/lib/website-intelligence'
import {
  analyzeWebsiteUpgradeAction,
} from '@/app/actions/website-upgrade'
import type { WebsiteUpgradeInput } from '@/lib/website-upgrade/types'

// Mock DNS lookup function that simulates public and private resolutions
async function mockDnsLookup(hostname: string): Promise<string[]> {
  const table: Record<string, string[]> = {
    'example.com': ['93.184.216.34'],
    'public-clinic.com': ['104.21.55.10'],
    'dharmasdental.com': ['172.67.180.120'],
    'subdomain.example.com': ['93.184.216.35'],
    'internal-host.com': ['10.0.0.5'],
    'evil-redirect.com': ['192.168.1.1'],
    'loopback-domain.com': ['127.0.0.1'],
    'cloud-meta.com': ['169.254.169.254'],
  }
  if (table[hostname]) return table[hostname]
  throw new Error(`getaddrinfo ENOTFOUND ${hostname}`)
}

// Deterministic Local HTML Fixture (Phase 11)
const DETERMINISTIC_HTML_FIXTURE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Dental Care - Modern Family Dentistry</title>
  <meta name="description" content="Compassionate dental care in Downtown Seattle offering preventive cleanings, teeth whitening, and orthodontic consults.">
  <link rel="canonical" href="https://example.com/canonical-home">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Dentist",
    "name": "Apex Dental Care",
    "telephone": "+1-206-555-0199"
  }
  </script>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="nav-link">Home</a>
      <a href="/services" class="nav-link">Services</a>
      <a href="/about" class="nav-link">About Us</a>
      <a href="https://external-reviews.com/apex" class="nav-link">Reviews</a>
    </nav>
  </header>

  <main>
    <h1>Modern Family & Cosmetic Dentistry</h1>
    <p>Welcome to our clinic. We provide dental wellness for the whole family.</p>

    <div class="cta-banner">
      <a href="/appointment" class="btn btn-primary">Book Consultation</a>
      <a href="tel:+12065550199" class="phone-cta">Call Us: (206) 555-0199</a>
      <a href="https://wa.me/12065550199" class="wa-btn">Chat on WhatsApp</a>
    </div>

    <section id="services">
      <h2>Preventive Dental Hygiene</h2>
      <p>Routine cleanings and oral health exams.</p>
      <h2>Cosmetic Teeth Whitening</h2>
      <p>Professional in-office whitening solutions.</p>
    </section>

    <section id="contact-form">
      <h2>Request an Appointment</h2>
      <form action="/submit-appointment" method="POST">
        <input type="text" name="patient_name" placeholder="Your Name" required>
        <input type="email" name="patient_email" placeholder="Email Address" required>
        <input type="tel" name="patient_phone" placeholder="Phone Number">
        <button type="submit">Submit Request</button>
      </form>
    </section>

    <section id="gallery">
      <img src="/images/clinic-front.jpg" alt="Apex Dental modern reception area">
      <img src="/images/decorative-icon.png">
    </section>
  </main>

  <footer>
    <p>Contact us at <a href="mailto:appointments@apexdental.com">appointments@apexdental.com</a></p>
  </footer>
</body>
</html>`

describe('Live Website Intelligence — URL Security & SSRF Protection (Phase 10)', () => {
  it('accepts valid public HTTPS URLs', async () => {
    const res = await validateUntrustedUrl('https://example.com/clinic', {
      lookupFn: mockDnsLookup,
    })
    expect(res.valid).toBe(true)
    expect(res.url?.hostname).toBe('example.com')
  })

  it('accepts valid public HTTP URLs', async () => {
    const res = await validateUntrustedUrl('http://example.com/page', {
      lookupFn: mockDnsLookup,
    })
    expect(res.valid).toBe(true)
    expect(res.url?.protocol).toBe('http:')
  })

  it('rejects malformed or unparseable URLs', async () => {
    const res = await validateUntrustedUrl('not-a-valid-url-at-all!@@')
    expect(res.valid).toBe(false)
    expect(res.reason).toBeDefined()
  })

  it('rejects localhost hostnames', async () => {
    const res1 = await validateUntrustedUrl('http://localhost:3000')
    expect(res1.valid).toBe(false)
    expect(res1.reason).toMatch(/internal|local|reserved/i)

    const res2 = await validateUntrustedUrl('http://app.localhost/test')
    expect(res2.valid).toBe(false)
  })

  it('rejects IPv4 loopback (127.0.0.1)', async () => {
    const res = await validateUntrustedUrl('http://127.0.0.1:8080')
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/private|loopback|reserved/i)
  })

  it('rejects 0.0.0.0', async () => {
    const res = await validateUntrustedUrl('http://0.0.0.0/')
    expect(res.valid).toBe(false)
  })

  it('rejects private IPv4 subnets (10.x, 192.168.x, 172.16-31.x)', async () => {
    const r1 = await validateUntrustedUrl('http://10.0.0.1/')
    const r2 = await validateUntrustedUrl('https://192.168.1.1/admin')
    const r3 = await validateUntrustedUrl('http://172.16.0.1/')

    expect(r1.valid).toBe(false)
    expect(r2.valid).toBe(false)
    expect(r3.valid).toBe(false)
  })

  it('rejects link-local / cloud metadata IP (169.254.169.254)', async () => {
    const res = await validateUntrustedUrl('http://169.254.169.254/latest/meta-data/')
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/private|loopback|reserved|metadata/i)
  })

  it('rejects IPv6 loopback (::1)', async () => {
    const res = await validateUntrustedUrl('http://[::1]:3000/')
    expect(res.valid).toBe(false)
  })

  it('rejects cloud metadata hostnames', async () => {
    const res = await validateUntrustedUrl('http://metadata.google.internal/computeMetadata/v1/')
    expect(res.valid).toBe(false)
  })

  it('rejects unsupported protocols (file, javascript, data, ftp)', async () => {
    const rFile = await validateUntrustedUrl('file:///etc/passwd')
    const rJs = await validateUntrustedUrl('javascript:alert(1)')
    const rData = await validateUntrustedUrl('data:text/html,<html>Hello</html>')
    const rFtp = await validateUntrustedUrl('ftp://example.com/file.txt')

    expect(rFile.valid).toBe(false)
    expect(rJs.valid).toBe(false)
    expect(rData.valid).toBe(false)
    expect(rFtp.valid).toBe(false)
  })

  it('rejects domains that resolve via DNS to private IPs', async () => {
    const res = await validateUntrustedUrl('https://internal-host.com/', {
      lookupFn: mockDnsLookup,
    })
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/restricted private or reserved/i)
  })

  it('validates and blocks redirects into private IPs (redirect SSRF protection)', async () => {
    const current = new URL('https://example.com/')
    const res = await validateRedirectTarget('http://192.168.1.1/secret', current, {
      lookupFn: mockDnsLookup,
    })
    expect(res.valid).toBe(false)
    expect(res.reason).toMatch(/private|loopback|reserved/i)
  })

  it('normalizes same-origin crawl URLs and strips tracking parameters', () => {
    const base = new URL('https://example.com')

    const clean = normalizeSameOriginCrawlUrl(
      '/services?utm_source=facebook&utm_medium=cpc&ref=123#section',
      base
    )
    expect(clean).toBe('https://example.com/services')

    // Disallows external origin
    const external = normalizeSameOriginCrawlUrl('https://otherdomain.com/about', base)
    expect(external).toBeNull()

    // Disallows file binaries
    const pdf = normalizeSameOriginCrawlUrl('/downloads/brochure.pdf', base)
    expect(pdf).toBeNull()

    // Disallows admin/auth paths
    const admin = normalizeSameOriginCrawlUrl('/admin/login', base)
    expect(admin).toBeNull()
  })
})

describe('HTML Parser & Evidence Extractor (Phase 11 & 12)', () => {
  it('correctly extracts title, meta description, and canonical URL from fixture', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    expect(doc.title).toBe('Apex Dental Care - Modern Family Dentistry')
    expect(doc.metaDescription).toContain('Compassionate dental care in Downtown Seattle')
    expect(doc.canonicalUrl).toBe('https://example.com/canonical-home')
    expect(doc.language).toBe('en')
    expect(doc.hasViewportMeta).toBe(true)
  })

  it('extracts headings with accurate levels', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    expect(doc.headings).toContainEqual({
      level: 1,
      text: 'Modern Family & Cosmetic Dentistry',
    })
    expect(doc.headings).toContainEqual({
      level: 2,
      text: 'Preventive Dental Hygiene',
    })
    expect(doc.headings).toContainEqual({
      level: 2,
      text: 'Cosmetic Teeth Whitening',
    })
  })

  it('extracts forms with lead capture field detection', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page } = extractPageEvidence(doc, 'https://example.com/')

    expect(page.forms.length).toBe(1)
    expect(page.forms[0].hasEmailField).toBe(true)
    expect(page.forms[0].hasPhoneField).toBe(true)
    expect(page.forms[0].submitButtonText).toBe('Submit Request')
  })

  it('extracts contact signals (phone, email, WhatsApp)', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page } = extractPageEvidence(doc, 'https://example.com/')

    const phoneValues = page.contacts.filter((c) => c.type === 'phone').map((c) => c.value)
    const emailValues = page.contacts.filter((c) => c.type === 'email').map((c) => c.value)
    const waValues = page.contacts.filter((c) => c.type === 'whatsapp').map((c) => c.value)

    expect(phoneValues).toContain('+12065550199')
    expect(emailValues).toContain('appointments@apexdental.com')
    expect(waValues.some((v) => v.includes('wa.me'))).toBe(true)
  })

  it('extracts prominent CTA buttons and booking signals', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page } = extractPageEvidence(doc, 'https://example.com/')

    const bookingCtas = page.buttons.filter((b) => b.isBookingCta)
    expect(bookingCtas.length).toBeGreaterThan(0)
    expect(bookingCtas[0].text).toContain('Book Consultation')
  })

  it('accurately measures image alt text coverage', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page, evidence } = extractPageEvidence(doc, 'https://example.com/')

    expect(page.images.length).toBe(2)
    expect(page.images[0].hasAlt).toBe(true)
    expect(page.images[1].hasAlt).toBe(false)

    const altEvidence = evidence.find((e) => e.type === 'image_alt_coverage')
    expect(altEvidence?.value).toBe('1/2 images have alt text')
  })

  it('detects Schema.org JSON-LD structured data presence', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page, evidence } = extractPageEvidence(doc, 'https://example.com/')

    expect(page.structuredData.hasJsonLd).toBe(true)
    expect(page.structuredData.detectedTypes).toContain('Dentist')

    const schemaEvidence = evidence.find((e) => e.type === 'structured_data')
    expect(schemaEvidence?.status).toBe('FOUND')
  })
})

describe('Crawler Resource Limits & Zero Hallucination (Phase 4, 6, 13)', () => {
  it('enforces maxPages limit during multi-page crawl', async () => {
    // Custom mock fetch that simulates 5 pages
    const mockFetch = async (urlStr: string) => {
      return new Response(DETERMINISTIC_HTML_FIXTURE, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    }

    const crawl = await crawlWebsite('https://example.com/', {
      maxPages: 2,
      fetchFn: mockFetch as any,
      lookupFn: mockDnsLookup,
    })

    expect(crawl.success).toBe(true)
    expect(crawl.pages.length).toBeLessThanOrEqual(2)
    expect(crawl.summary.totalPagesCrawled).toBeLessThanOrEqual(2)
  })

  it('strictly excludes unobserved elements with explicit NOT_FOUND status', () => {
    const sparseHtml = `<!DOCTYPE html><html><head><title>Sparse Page</title></head><body><h1>Simple Headline</h1></body></html>`
    const doc = parseHtmlDocument(sparseHtml)
    const { evidence } = extractPageEvidence(doc, 'https://example.com/')

    const metaEvidence = evidence.find((e) => e.type === 'meta_description')
    const phoneEvidence = evidence.find((e) => e.type === 'phone_contact')
    const formEvidence = evidence.find((e) => e.type === 'lead_capture_form')

    expect(metaEvidence?.status).toBe('NOT_FOUND')
    expect(phoneEvidence?.status).toBe('NOT_FOUND')
    expect(formEvidence?.status).toBe('NOT_FOUND')
  })
})

describe('Website Upgrade Integration with Live Intelligence (Phase 8 & 14)', () => {
  it('enriches WebsiteUpgradeInput with discovered crawl evidence and preserves claim safety', () => {
    const doc = parseHtmlDocument(DETERMINISTIC_HTML_FIXTURE)
    const { page, evidence } = extractPageEvidence(doc, 'https://example.com/')

    const mockCrawlResult = {
      success: true,
      startingUrl: 'https://example.com/',
      finalBaseUrl: 'https://example.com',
      pages: [page],
      allEvidence: evidence,
      summary: {
        totalPagesCrawled: 1,
        totalHeadingsFound: 3,
        totalFormsFound: 1,
        totalCtasFound: 3,
        phoneNumbers: ['+12065550199'],
        emailAddresses: ['appointments@apexdental.com'],
        whatsappLinks: ['https://wa.me/12065550199'],
        detectedServices: ['Preventive Dental Hygiene', 'Cosmetic Teeth Whitening'],
        detectedTitle: 'Apex Dental Care - Modern Family Dentistry',
        detectedDescription: 'Compassionate dental care in Downtown Seattle',
        missingCriticalElements: [],
      },
      errors: [],
      crawlDurationMs: 45,
    }

    const initialInput: WebsiteUpgradeInput = {
      url: 'https://example.com',
      business_name: 'Apex Dental Care',
      industry: 'Healthcare & Dental',
    }

    const enriched = enrichInputWithCrawlResult(initialInput, mockCrawlResult)

    // Contact details and description should be enriched from discovered facts
    expect(enriched.contact_phone).toBe('+12065550199')
    expect(enriched.contact_email).toBe('appointments@apexdental.com')
    expect(enriched.current_description).toBe('Compassionate dental care in Downtown Seattle')
    expect(enriched.current_services).toContain('Preventive Dental Hygiene')
    expect(enriched.supplied_evidence?.length).toBeGreaterThan(0)
    expect(enriched.crawl_summary?.totalPagesCrawled).toBe(1)

    // Run existing Website Analyzer on enriched input
    const res = analyzeWebsiteUpgradeAction(enriched)
    expect(res).toBeDefined()
  })
})

describe('Live Website Intelligence — SPA Detection, UNKNOWN Status & Bundle Intelligence', () => {
  const SPA_SHELL_FIXTURE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dharmas Dental | Best Dental Hospital in Tirupathi</title>
  <meta name="description" content="Dharmas Dental, best dental hospital in Tirupathi for dental implants, braces, root canal, cosmetic dentistry & smile design." />
  <script type="module" crossorigin src="/assets/index-C4bQ30Bd.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`

  const BUNDLE_FIXTURE = `
    const clinicPhone = "tel:+918919457887";
    const clinicEmail = "mailto:dharmasdental@gmail.com";
    const clinicWhatsApp = "https://wa.me/918919457887?text=Hi";
    const appRoutes = ["/services", "/about", "/contact", "/doctors"];
  `

  it('A. Detects client-side rendered SPA shells accurately', () => {
    const minSpa = `<html><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>`
    const doc = parseHtmlDocument(minSpa)
    expect(doc.isSpaShell).toBe(true)
    expect(doc.spaFramework).toMatch(/React/i)
    expect(doc.scriptSources).toContain('/assets/app.js')

    const dharmasDoc = parseHtmlDocument(SPA_SHELL_FIXTURE)
    expect(dharmasDoc.isSpaShell).toBe(true)
    expect(dharmasDoc.spaFramework).toMatch(/React/i)
    expect(dharmasDoc.title).toBe('Dharmas Dental | Best Dental Hospital in Tirupathi')
    expect(dharmasDoc.metaDescription).toContain('dental implants, braces, root canal')
  })

  it('B. Sets status to UNKNOWN for unrendered DOM elements in SPA shells', () => {
    const doc = parseHtmlDocument(SPA_SHELL_FIXTURE)
    const { evidence } = extractPageEvidence(doc, 'https://dharmasdental.com/')

    const h1Ev = evidence.find((e) => e.type === 'h1_heading')
    expect(h1Ev?.status).toBe('UNKNOWN')
    expect(h1Ev?.detail).toMatch(/SPA shell|dynamic/i)

    const ctaEv = evidence.find((e) => e.type === 'cta_signal')
    expect(ctaEv?.status).toBe('UNKNOWN')

    const formEv = evidence.find((e) => e.type === 'lead_capture_form')
    expect(formEv?.status).toBe('UNKNOWN')

    // Meta elements in <head> remain FOUND
    const titleEv = evidence.find((e) => e.type === 'title')
    expect(titleEv?.status).toBe('FOUND')
    expect(titleEv?.provenance).toBe('meta')

    const metaEv = evidence.find((e) => e.type === 'meta_description')
    expect(metaEv?.status).toBe('FOUND')
    expect(metaEv?.provenance).toBe('meta')
  })

  it('C. SPA crawl does NOT produce false missing-critical elements', async () => {
    const mockFetch = async () =>
      ({
        status: 200,
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => SPA_SHELL_FIXTURE,
        body: null,
      }) as any

    const crawl = await crawlWebsite('https://dharmasdental.com/', {
      fetchFn: mockFetch,
      lookupFn: mockDnsLookup,
    })

    expect(crawl.success).toBe(true)
    expect(crawl.summary.missingCriticalElements).not.toContain('H1 Main Heading')
    expect(crawl.summary.missingCriticalElements).not.toContain('Prominent Call-to-Action')
    expect(crawl.summary.missingCriticalElements).not.toContain('Direct Lead Capture Form')
    expect(crawl.summary.missingCriticalElements).not.toContain('Clear Contact Method')
    expect(crawl.summary.missingCriticalElements).toContain(
      'Static HTML Pre-Rendering / Client-Rendered SPA'
    )
  })

  it('D. Preserves NOT_FOUND behavior on verified static HTML pages', () => {
    const staticHtmlNoH1 = `<!DOCTYPE html>
<html>
<head><title>Static Page</title></head>
<body>
  <nav><a href="/">Home</a></nav>
  <p>This is a full static paragraph with plenty of text describing our business in detail so it is not mistaken for an empty SPA shell.</p>
</body>
</html>`

    const doc = parseHtmlDocument(staticHtmlNoH1)
    expect(doc.isSpaShell).toBe(false)

    const { evidence } = extractPageEvidence(doc, 'https://example.com/')
    const h1Ev = evidence.find((e) => e.type === 'h1_heading')
    expect(h1Ev?.status).toBe('NOT_FOUND')
    expect(h1Ev?.detail).toMatch(/No H1 main heading detected/i)
  })

  it('E. Extracts contact signals, services, and routes from same-origin bundle with provenance', () => {
    const doc = parseHtmlDocument(SPA_SHELL_FIXTURE)
    const { page, evidence } = extractPageEvidence(
      doc,
      'https://dharmasdental.com/',
      200,
      'text/html',
      0,
      BUNDLE_FIXTURE
    )

    const phoneEv = evidence.find((e) => e.type === 'phone_contact')
    expect(phoneEv?.status).toBe('FOUND')
    expect(phoneEv?.provenance).toBe('same_origin_bundle')
    expect(phoneEv?.value).toBe('+918919457887')
    expect(phoneEv?.detail).toContain('same-origin application bundle')

    const emailEv = evidence.find((e) => e.type === 'email_contact')
    expect(emailEv?.status).toBe('FOUND')
    expect(emailEv?.provenance).toBe('same_origin_bundle')
    expect(emailEv?.value).toBe('dharmasdental@gmail.com')

    const waEv = evidence.find((e) => e.type === 'whatsapp_contact')
    expect(waEv?.status).toBe('FOUND')
    expect(waEv?.provenance).toBe('same_origin_bundle')
    expect(waEv?.value).toContain('wa.me/918919457887')

    expect(page.discoveredRoutes).toContain('/services')
    expect(page.discoveredRoutes).toContain('/contact')
  })

  it('F. Enforces strict same-origin and SSRF protection on bundle fetching', async () => {
    // Cross-origin bundle fetch rejected
    const crossOrigin = await safeFetchSameOriginAsset(
      'https://evil-host.com/assets/app.js',
      'https://example.com/',
      { lookupFn: mockDnsLookup }
    )
    expect(crossOrigin.success).toBe(false)
    expect(crossOrigin.error).toMatch(/cross-origin/i)

    // Private / loopback destination rejected
    const loopback = await safeFetchSameOriginAsset(
      'http://127.0.0.1/app.js',
      'http://127.0.0.1/',
      { lookupFn: mockDnsLookup }
    )
    expect(loopback.success).toBe(false)
  })

  it('G. Claim Guard: UNKNOWN status never converts into a negative audit claim', () => {
    const doc = parseHtmlDocument(SPA_SHELL_FIXTURE)
    const { evidence } = extractPageEvidence(doc, 'https://dharmasdental.com/')

    // Verify all unrendered elements are strictly UNKNOWN, never NOT_FOUND
    const h1 = evidence.find((e) => e.type === 'h1_heading')
    const cta = evidence.find((e) => e.type === 'cta_signal')
    const form = evidence.find((e) => e.type === 'lead_capture_form')

    expect(h1?.status).toBe('UNKNOWN')
    expect(cta?.status).toBe('UNKNOWN')
    expect(form?.status).toBe('UNKNOWN')

    expect(h1?.status).not.toBe('NOT_FOUND')
    expect(cta?.status).not.toBe('NOT_FOUND')
    expect(form?.status).not.toBe('NOT_FOUND')
  })
})
