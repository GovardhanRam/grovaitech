/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/roles/reviewer.ts
 *
 * Role 4: Reviewer
 * Reads the git diff, test results, and plan.
 * Calls an independent LLM and writes review.md.
 * Decision: APPROVE | REQUEST_CHANGES | REJECT
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { LLMAdapter } from '../adapters/llm/types'
import type { TaskState } from '../task'
import { writeReview } from '../task'
import { formatTestResultsForReview, type TestResults } from './tester'
import { getDiff } from '../git'
import { logger } from '../logger'

export type ReviewDecision = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'

export interface ReviewResult {
  decision: ReviewDecision
  content: string
  requiredChanges: string | null
}

const MAX_DIFF_CHARS = 20_000

function loadSystemPrompt(repoRoot: string): string {
  const promptPath = join(repoRoot, 'agents', 'REVIEWER.md')
  if (existsSync(promptPath)) {
    return readFileSync(promptPath, 'utf-8').trim()
  }
  return [
    'You are the Grovaitech AI Development Reviewer.',
    'Evaluate the implementation and output one of: APPROVE, REQUEST_CHANGES, or REJECT.',
    'Follow the format: ## Decision, ## Summary, ## Plan Compliance, ## Code Quality, ## Test Results, ## Required Changes.',
  ].join(' ')
}

/**
 * Strictly extracts the review decision from the `## Decision` section.
 * Requirements:
 * - Must isolate the `## Decision` section.
 * - Extracts only exact APPROVE, REQUEST_CHANGES, or REJECT tokens.
 * - Never infers APPROVE from casual occurrences in summary or review text.
 * - Detects negations and conflicts.
 * - Defaults strictly to REQUEST_CHANGES if ambiguous, missing, or unparseable.
 */
export function extractDecision(reviewText: string): ReviewDecision {
  if (!reviewText) {
    logger.warn('Empty review text — defaulting to REQUEST_CHANGES')
    return 'REQUEST_CHANGES'
  }

  // Locate the ## Decision section
  const match = reviewText.match(/(?:^|\n)##\s+Decision\s*\n([\s\S]*?)(?=\n##\s+|$)/i)
  if (!match) {
    logger.warn('Missing ## Decision section in review — defaulting to REQUEST_CHANGES')
    return 'REQUEST_CHANGES'
  }

  const sectionContent = match[1].trim()
  if (!sectionContent) {
    logger.warn('Empty ## Decision section in review — defaulting to REQUEST_CHANGES')
    return 'REQUEST_CHANGES'
  }

  const lines = sectionContent.split('\n')
  const foundDecisions = new Set<ReviewDecision>()

  for (const rawLine of lines) {
    // Strip markdown formatting (bold, italics, backticks, blockquotes, punctuation)
    const cleaned = rawLine
      .replace(/[*`_#>"':]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()

    if (!cleaned) continue

    // Guard against explicit negations ("DO NOT APPROVE", "NOT APPROVE", "CANNOT APPROVE")
    if (/\b(?:NOT|DON'T|DO NOT|CANNOT|CAN'T|WON'T|NEVER)\s+APPROVE\b/.test(cleaned)) {
      foundDecisions.add('REQUEST_CHANGES')
      continue
    }

    const hasApprove = /\bAPPROVE\b/.test(cleaned)
    const hasRequestChanges = /\bREQUEST[_\s]+CHANGES\b/.test(cleaned)
    const hasReject = /\bREJECT\b/.test(cleaned)

    if (hasApprove) foundDecisions.add('APPROVE')
    if (hasRequestChanges) foundDecisions.add('REQUEST_CHANGES')
    if (hasReject) foundDecisions.add('REJECT')
  }

  // Must have exactly one unique decision
  if (foundDecisions.size === 1) {
    if (foundDecisions.has('APPROVE')) return 'APPROVE'
    if (foundDecisions.has('REQUEST_CHANGES')) return 'REQUEST_CHANGES'
    if (foundDecisions.has('REJECT')) return 'REJECT'
  }

  // Ambiguous, multiple conflicting, or zero parsed decisions
  logger.warn('Ambiguous or unparseable review decision in ## Decision — defaulting strictly to REQUEST_CHANGES', {
    decisionsFound: Array.from(foundDecisions),
    sectionSnippet: sectionContent.slice(0, 150),
  })
  return 'REQUEST_CHANGES'
}

function extractRequiredChanges(reviewText: string): string | null {
  const marker = reviewText.indexOf('## Required Changes')
  if (marker < 0) return null
  const after = reviewText.slice(marker)
  // Find the next ## section
  const nextSection = after.indexOf('\n## ', 4)
  const changesBlock = nextSection > 0 ? after.slice(0, nextSection) : after
  // Strip the header line
  const withoutHeader = changesBlock.replace(/^##\s+Required Changes\s*/i, '').trim()
  if (!withoutHeader || withoutHeader.toLowerCase().includes('none')) return null
  return withoutHeader
}

export async function runReviewer(
  llm: LLMAdapter,
  state: TaskState,
  taskDescription: string,
  planContent: string,
  testResults: TestResults,
  repoRoot: string,
): Promise<ReviewResult> {
  logger.step('REVIEWER', 'Evaluating implementation')

  const diff = getDiff(repoRoot)
  const truncatedDiff = diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + `\n... [diff truncated, ${diff.length} total chars]`
    : diff

  const systemPrompt = loadSystemPrompt(repoRoot)
  const testSummary = formatTestResultsForReview(testResults)

  const userPrompt = [
    '## Original Task',
    taskDescription,
    '',
    '## Implementation Plan',
    planContent,
    '',
    '## Git Diff',
    '```diff',
    truncatedDiff || '(no changes detected)',
    '```',
    '',
    testSummary,
  ].join('\n')

  logger.info('Calling LLM for review', { model: llm.name, diffChars: diff.length })

  const result = await llm.complete({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.1, // Low temperature for consistent review decisions
    maxTokens: 4096,
  })

  const reviewContent = result.text.trim()
  const decision = extractDecision(reviewContent)
  const requiredChanges = decision === 'REQUEST_CHANGES' ? extractRequiredChanges(reviewContent) : null

  writeReview(state, reviewContent)
  logger.info('Review complete', { decision, file: state.reviewFile, tokens: result.usage?.totalTokens })

  return { decision, content: reviewContent, requiredChanges }
}
