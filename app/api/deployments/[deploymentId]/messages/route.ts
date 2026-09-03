/**
 * Grovaitech AI Platform
 * app/api/deployments/[deploymentId]/messages/route.ts
 *
 * Inbound Deployment Runtime REST Ingress Boundary.
 * Accepts inbound customer messages for an activated Client Deployment,
 * validates deployment identity server-side, routes to the Live Deployment Runner,
 * and returns tenant-attributed agent responses and tool execution results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeLiveDeploymentTurn } from '@/lib/deployment/live-executor'
import type { ConversationTurn } from '@/lib/ai/runtime'

export interface InboundDeploymentMessageBody {
  message: string
  history?: ConversationTurn[]
  customerContext?: {
    name?: string
    phone?: string
    email?: string
  }
}

/**
 * POST /api/deployments/[deploymentId]/messages
 * Handles inbound customer message turns targeting a specific client deployment.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deploymentId: string }> | { deploymentId: string } }
) {
  try {
    // 1. Resolve Route Parameters
    const rawParams = await context.params
    const deploymentId = rawParams?.deploymentId?.trim()

    if (!deploymentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error: deploymentId path parameter is required.',
        },
        { status: 400 }
      )
    }

    // 2. Parse & Validate Request Body
    let body: InboundDeploymentMessageBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error: Request body must be valid JSON.',
        },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error: Request body is missing or invalid.',
        },
        { status: 400 }
      )
    }

    const { message, history, customerContext } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error: A non-empty "message" string is required.',
        },
        { status: 422 }
      )
    }

    // 3. Delegate to Live Deployment Runner (Server-Controlled Security Boundary)
    // Caller cannot supply employeeSlug, clientId, tools, or executionMode.
    const result = await executeLiveDeploymentTurn({
      deploymentId,
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      customerContext: {
        name: customerContext?.name?.trim() || null,
        phone: customerContext?.phone?.trim() || null,
        email: customerContext?.email?.trim() || null,
      },
      channel: 'api',
    })

    // 4. Return Structured Result
    if (!result.success) {
      const statusCode = result.error?.includes('not found')
        ? 404
        : result.error?.includes('Authorization Error')
        ? 403
        : 400

      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    console.error('[Deployment Inbound Messages API Exception]', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'An unexpected internal error occurred.',
      },
      { status: 500 }
    )
  }
}
