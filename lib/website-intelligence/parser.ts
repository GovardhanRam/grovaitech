/**
 * Grovaitech AI Platform
 * lib/website-intelligence/parser.ts
 *
 * Lightweight, zero-dependency HTML parser for structured website signal extraction.
 * Safely parses HTML strings to extract titles, metadata, headings, links, forms,
 * buttons, images, and structured data blocks.
 */

export interface ParsedHtmlElement {
  tag: string
  attributes: Record<string, string>
  innerHTML: string
  textContent: string
}

export interface RawParsedDocument {
  title?: string
  metaDescription?: string
  canonicalUrl?: string
  language?: string
  hasViewportMeta: boolean
  headings: Array<{ level: 1 | 2 | 3 | 4 | 5 | 6; text: string }>
  links: Array<{ href: string; text: string; rawAttrs: Record<string, string> }>
  forms: Array<{
    action?: string
    method?: string
    inputs: Array<{ name?: string; type?: string; placeholder?: string; required?: boolean }>
    submitText?: string
  }>
  buttons: Array<{ text: string; type?: string; rawAttrs: Record<string, string> }>
  images: Array<{ src: string; alt: string }>
  jsonLdScripts: string[]
  openGraphTags: Record<string, string>
  hasMicrodata: boolean
  cleanTextContent: string
  isSpaShell: boolean
  spaFramework?: string
  scriptSources: string[]
  noscriptFallback?: string
}

/**
 * Decodes standard HTML entities into plain text.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Extracts key-value attributes from an HTML tag string.
 */
export function extractAttributes(tagAttrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([a-zA-Z0-9_\-:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(tagAttrString)) !== null) {
    const key = match[1].toLowerCase()
    const val = match[2] ?? match[3] ?? match[4] ?? ''
    attrs[key] = decodeHtmlEntities(val)
  }

  return attrs
}

/**
 * Strips script, style, SVG, noscript tags, comments, and returns clean text.
 */
export function stripHtmlToText(html: string): string {
  if (!html) return ''

  return html
    .replace(/<!--[\s\S]*?-->/g, ' ') // comments
    .replace(/<script[\s\S]*?<\/script>/gi, ' ') // scripts
    .replace(/<style[\s\S]*?<\/style>/gi, ' ') // styles
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ') // svgs
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ') // noscripts
    .replace(/<[^>]+>/g, ' ') // remaining tags
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim()
}

/**
 * Parses raw HTML into a structured document representation.
 */
export function parseHtmlDocument(
  rawHtml: string,
  maxParseBytes: number = 1048576
): RawParsedDocument {
  // Truncate if exceeds max parse bytes to prevent regex ReDoS or memory pressure
  const html = rawHtml.length > maxParseBytes ? rawHtml.slice(0, maxParseBytes) : rawHtml

  const result: RawParsedDocument = {
    hasViewportMeta: false,
    headings: [],
    links: [],
    forms: [],
    buttons: [],
    images: [],
    jsonLdScripts: [],
    openGraphTags: {},
    hasMicrodata: false,
    cleanTextContent: '',
    isSpaShell: false,
    scriptSources: [],
  }

  // 1. Language Attribute on <html>
  const htmlTagMatch = /<html\s+([^>]*?)>/i.exec(html)
  if (htmlTagMatch) {
    const htmlAttrs = extractAttributes(htmlTagMatch[1])
    if (htmlAttrs.lang) {
      result.language = htmlAttrs.lang.trim().toLowerCase()
    }
  }

  // 2. Title Tag
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (titleMatch) {
    result.title = decodeHtmlEntities(stripHtmlToText(titleMatch[1]))
  }

  // 3. Meta Tags
  const metaRegex = /<meta\s+([^>]*?)\/?>/gi
  let metaMatch: RegExpExecArray | null
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const attrs = extractAttributes(metaMatch[1])

    // Viewport
    if (attrs.name === 'viewport') {
      result.hasViewportMeta = true
    }

    // Meta Description
    if (attrs.name === 'description' && attrs.content && !result.metaDescription) {
      result.metaDescription = attrs.content.trim()
    }

    // OpenGraph Tags
    if (attrs.property && attrs.property.startsWith('og:') && attrs.content) {
      result.openGraphTags[attrs.property] = attrs.content.trim()
      if (attrs.property === 'og:description' && !result.metaDescription) {
        result.metaDescription = attrs.content.trim()
      }
      if (attrs.property === 'og:title' && !result.title) {
        result.title = attrs.content.trim()
      }
    }
  }

  // 4. Canonical Link
  const canonicalMatch = /<link\s+[^>]*?rel\s*=\s*["']canonical["'][^>]*?\/?>/i.exec(html)
  if (canonicalMatch) {
    const attrs = extractAttributes(canonicalMatch[0])
    if (attrs.href) {
      result.canonicalUrl = attrs.href.trim()
    }
  }

  // 5. Headings (h1 to h6)
  const headingRegex = /<h([1-6])(?:\s+[^>]*?)?>([\s\S]*?)<\/h\1>/gi
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = headingRegex.exec(html)) !== null) {
    const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
    const text = decodeHtmlEntities(stripHtmlToText(headingMatch[2]))
    if (text) {
      result.headings.push({ level, text })
    }
  }

  // 6. Anchor Links (<a>)
  const linkRegex = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const attrs = extractAttributes(linkMatch[1])
    const text = decodeHtmlEntities(stripHtmlToText(linkMatch[2]))
    if (attrs.href) {
      result.links.push({
        href: attrs.href.trim(),
        text,
        rawAttrs: attrs,
      })
    }
  }

  // 7. Buttons (<button>)
  const buttonRegex = /<button\s*([^>]*?)>([\s\S]*?)<\/button>/gi
  let buttonMatch: RegExpExecArray | null
  while ((buttonMatch = buttonRegex.exec(html)) !== null) {
    const attrs = extractAttributes(buttonMatch[1])
    const text = decodeHtmlEntities(stripHtmlToText(buttonMatch[2]))
    if (text) {
      result.buttons.push({
        text,
        type: attrs.type || 'button',
        rawAttrs: attrs,
      })
    }
  }

  // 8. Forms (<form> ... </form>)
  const formRegex = /<form\s*([^>]*?)>([\s\S]*?)<\/form>/gi
  let formMatch: RegExpExecArray | null
  while ((formMatch = formRegex.exec(html)) !== null) {
    const formAttrs = extractAttributes(formMatch[1])
    const formInner = formMatch[2]

    const inputs: Array<{ name?: string; type?: string; placeholder?: string; required?: boolean }> = []
    let submitText: string | undefined

    // Extract inputs, textareas, selects
    const inputRegex = /<(input|textarea|select)\s+([^>]*?)\/?>/gi
    let inputMatch: RegExpExecArray | null
    while ((inputMatch = inputRegex.exec(formInner)) !== null) {
      const tag = inputMatch[1].toLowerCase()
      const attrs = extractAttributes(inputMatch[2])
      const inputType = tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : (attrs.type || 'text')

      if (inputType === 'submit') {
        submitText = attrs.value || 'Submit'
      } else {
        inputs.push({
          name: attrs.name,
          type: inputType,
          placeholder: attrs.placeholder,
          required: attrs.required !== undefined,
        })
      }
    }

    // Check for submit button inside form
    const submitBtnMatch = /<button[^>]*?(?:type=["']submit["'])?[^>]*?>([\s\S]*?)<\/button>/i.exec(formInner)
    if (submitBtnMatch && !submitText) {
      submitText = decodeHtmlEntities(stripHtmlToText(submitBtnMatch[1]))
    }

    result.forms.push({
      action: formAttrs.action,
      method: (formAttrs.method || 'GET').toUpperCase(),
      inputs,
      submitText: submitText || 'Submit',
    })
  }

  // 9. Images (<img>)
  const imgRegex = /<img\s+([^>]*?)\/?>/gi
  let imgMatch: RegExpExecArray | null
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const attrs = extractAttributes(imgMatch[1])
    if (attrs.src) {
      result.images.push({
        src: attrs.src.trim(),
        alt: attrs.alt?.trim() || '',
      })
    }
  }

  // 10. Structured Data (JSON-LD)
  const jsonLdRegex = /<script\s+[^>]*?type\s*=\s*["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi
  let jsonLdMatch: RegExpExecArray | null
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    const content = jsonLdMatch[1].trim()
    if (content) {
      result.jsonLdScripts.push(content)
    }
  }

  // 11. Microdata Detection
  if (/itemscope|itemtype/i.test(html)) {
    result.hasMicrodata = true
  }

  // 12. Script Sources Extraction (all <script src="...">)
  const scriptRegex = /<script\s+([^>]*?)>(?:([\s\S]*?)<\/script>)?/gi
  let scriptMatch: RegExpExecArray | null
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const attrs = extractAttributes(scriptMatch[1])
    if (attrs.src) {
      result.scriptSources.push(attrs.src.trim())
    }
  }

  // 13. Noscript Fallback
  const noscriptMatch = /<noscript\s*[^>]*>([\s\S]*?)<\/noscript>/i.exec(html)
  if (noscriptMatch) {
    result.noscriptFallback = decodeHtmlEntities(stripHtmlToText(noscriptMatch[1]))
  }

  // 14. Clean Body Text
  result.cleanTextContent = stripHtmlToText(html)

  // 15. Single-Page Application (SPA) Shell Detection
  const hasRootContainer =
    /<div\s+[^>]*?id=["'](?:root|__next|app|mount|application)["'][^>]*>/i.test(html) ||
    /<(?:app-root|root-app)(?:\s+[^>]*?)?>/i.test(html)

  const hasAppScript =
    result.scriptSources.some((src) =>
      /(?:bundle|index|app|main|chunk|vite|runtime)[^"']*\.js/i.test(src)
    ) ||
    /<script[^>]*type=["']module["']/i.test(html) ||
    result.scriptSources.length > 0

  if (
    (hasRootContainer && (result.headings.length === 0 || hasAppScript)) ||
    (result.cleanTextContent.length < 300 && hasAppScript && result.headings.length === 0)
  ) {
    result.isSpaShell = true

    if (/<div\s+[^>]*?id=["']__next["']/i.test(html) || /__NEXT_DATA__/i.test(html)) {
      result.spaFramework = 'Next.js'
    } else if (/<(?:app-root|root-app)/i.test(html)) {
      result.spaFramework = 'Angular'
    } else if (
      /<div\s+[^>]*?id=["']root["']/i.test(html) &&
      (/vite/i.test(html) || result.scriptSources.some((s) => /vite/i.test(s)))
    ) {
      result.spaFramework = 'React / Vite'
    } else if (/<div\s+[^>]*?id=["']root["']/i.test(html)) {
      result.spaFramework = 'React'
    } else if (/<div\s+[^>]*?id=["']app["']/i.test(html) && /vue/i.test(html)) {
      result.spaFramework = 'Vue'
    } else if (/<div\s+[^>]*?id=["']app["']/i.test(html)) {
      result.spaFramework = 'Vue / Client SPA'
    } else {
      result.spaFramework = 'Client-Side SPA'
    }
  }

  return result
}
