/**
 * Grovaitech AI Platform
 * app/api/voice/token/route.ts
 *
 * Ephemeral Token Generation for GOVA Voice UI v1 (Gemini Live API).
 * Obtains a short-lived, single-use authentication token from Google's
 * Generative Language API, allowing client-side WebSockets to connect directly
 * to Google without exposing the server's GEMINI_API_KEY.
 */

import { NextRequest, NextResponse } from 'next/server'

export const GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview'
export const GEMINI_LIVE_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained'

export async function POST(_request: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim()

    if (!apiKey || apiKey.includes('placeholder')) {
      return NextResponse.json(
        {
          error: 'Voice session initialization unavailable: GEMINI_API_KEY is not configured.',
          code: 'MISSING_API_KEY',
        },
        { status: 503 }
      )
    }

    // Request a single-use ephemeral token valid for 15 minutes
    const expireTime = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const tokenEndpoint = `https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=${apiKey}`

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      // Redact any potential sensitive data from logs
      const sanitized = errText.replace(/AIza[0-9A-Za-z-_]{20,}/g, '[REDACTED_KEY]')
      console.error('[Voice Token API Error]', res.status, sanitized)

      return NextResponse.json(
        {
          error: 'Failed to obtain Live API authentication token from Google service.',
          code: 'UPSTREAM_TOKEN_ERROR',
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    const fullToken = data.name

    if (!fullToken) {
      return NextResponse.json(
        {
          error: 'Invalid response from token service: token identifier missing.',
          code: 'INVALID_TOKEN_RESPONSE',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      token: fullToken,
      model: GEMINI_LIVE_MODEL,
      wsUrl: GEMINI_LIVE_WS_URL,
      expireTime,
    })
  } catch (error: any) {
    console.error('[Voice Token Exception]', error?.message || 'Unknown error')
    return NextResponse.json(
      {
        error: 'Internal server error while initializing voice session.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
