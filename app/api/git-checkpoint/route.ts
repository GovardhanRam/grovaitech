import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET() {
  const result: any = {}
  const cwd = process.cwd()

  try {
    result.statusBefore = execSync('git status --porcelain', { cwd, encoding: 'utf8' })
  } catch (e: any) {
    result.statusBeforeError = e.message
  }

  try {
    // Stage source files
    execSync('git add app components lib types public package.json tsconfig.json .gitignore README.md', { cwd, encoding: 'utf8' })
    result.stagedFiles = execSync('git diff --name-only --cached', { cwd, encoding: 'utf8' }).split('\n').filter(Boolean)

    // Security check: ensure no .env files are staged
    const envStaged = result.stagedFiles.filter((f: string) => f.toLowerCase().includes('.env'))
    if (envStaged.length > 0) {
      execSync('git reset', { cwd, encoding: 'utf8' })
      return NextResponse.json({ error: 'Security abort: .env file in staged list', envStaged })
    }

    // Commit
    const commitMsg = 'checkpoint: AI Workforce OS and real estate vertical slice'
    result.commitOutput = execSync(`git commit -m "${commitMsg}"`, { cwd, encoding: 'utf8' })
    result.commitHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim()
    result.lastCommit = execSync('git log -1 --format="%H | %an | %ad | %s"', { cwd, encoding: 'utf8' }).trim()
    result.stat = execSync('git show --stat --oneline HEAD', { cwd, encoding: 'utf8' })
    result.remainingStatus = execSync('git status --porcelain', { cwd, encoding: 'utf8' })
    result.success = true
  } catch (err: any) {
    result.error = err.message
    result.stdout = err.stdout?.toString()
    result.stderr = err.stderr?.toString()
  }

  return NextResponse.json(result)
}
