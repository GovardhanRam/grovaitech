/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/builder/manual.ts
 *
 * Manual / Fallback Builder Adapter.
 *
 * Used when:
 *   - No automated Builder CLI is available or authenticated
 *   - ORCHESTRATOR_BUILDER=manual is explicitly set
 *
 * Displays the plan to the user, opens an interactive prompt,
 * and waits for them to confirm they have completed the implementation.
 * This preserves the full orchestrator pipeline (Tester + Reviewer)
 * while the human acts as the Builder.
 */

import * as readline from 'readline'
import type { BuilderAdapter, BuilderInput, BuilderResult } from './types'

export class ManualBuilderAdapter implements BuilderAdapter {
  readonly name = 'Manual (Human Builder)'
  readonly adapterId = 'manual'

  async checkAvailability(): Promise<{ available: boolean; reason?: string }> {
    // Always available — requires a human at the terminal
    return { available: true }
  }

  async execute(input: BuilderInput): Promise<BuilderResult> {
    const divider = '═'.repeat(70)

    console.log('')
    console.log(divider)
    console.log(' MANUAL BUILDER — Human Action Required')
    console.log(divider)
    console.log('')
    console.log(' The automated Builder is not available in this environment.')
    console.log(' To enable it: run `claude auth login` in your terminal.')
    console.log('')
    console.log(' YOUR TASK:')
    console.log(' ─────────────────────────────────────────────────')
    console.log(input.taskDescription)
    console.log('')
    console.log(' IMPLEMENTATION PLAN:')
    console.log(' ─────────────────────────────────────────────────')
    console.log(input.planContent)
    console.log('')
    console.log(divider)
    console.log(' Implement the plan above, then return here.')
    console.log(' The orchestrator will run lint, typecheck, tests, and review automatically.')
    console.log(divider)
    console.log('')

    await this.waitForConfirmation()

    return {
      success: true,
      stdout: '[Manual builder] Human confirmed implementation complete',
      stderr: '',
      exitCode: null,
      summary: 'Manual implementation completed by human',
    }
  }

  private waitForConfirmation(): Promise<void> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      const ask = () => {
        rl.question(' > Type "done" when your implementation is complete: ', (answer) => {
          if (answer.trim().toLowerCase() === 'done') {
            rl.close()
            resolve()
          } else {
            console.log('   Please type exactly "done" to continue.')
            ask()
          }
        })
      }
      ask()
    })
  }
}
