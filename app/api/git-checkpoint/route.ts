import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET() {
  try {
    const cwd = process.cwd()

    // 1. Get initial git status
    const statusBefore = execSync('git status --porcelain', { cwd, encoding: 'utf8' })

    // 2. Stage all tracked and new non-secret source files
    // Explicitly add app, components, lib, types, public, package.json, tsconfig.json, etc.
    execSync('git add app components lib types public package.json tsconfig.json .gitignore README.md', { cwd, encoding: 'utf8' })

    // 3. Check staged files to ensure no .env files are staged
    const stagedFiles = execSync('git diff --name-only --cached', { cwd, encoding: 'utf8' })

    const hasEnvStaged = stagedFiles.split('\n').some(f => f.includes('.env'))
    if (hasEnvStaged) {
      execSync('git reset', { cwd, encoding: 'utf8' })
      return NextResponse.json({
        error: 'Security abort: .env file was detected in staged files. Aborted.',
        stagedFiles
      }, { status: 500 })
    }

    // 4. Create the commit
    const commitMsg = 'checkpoint: AI Workforce OS and real estate vertical slice'
    const commitOutput = execSync(`git commit -m "${commitMsg}"`, { cwd, encoding: 'utf8' })

    // 5. Verify commit hash & log
    const lastCommit = execSync('git log -1 --format="%H | %an | %ad | %s"', { cwd, encoding: 'utf8' })
    const commitHash = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim()
    const committedFiles = execSync('git show --stat --oneline HEAD', { cwd, encoding: 'utf8' })
    const statusAfter = execSync('git status --porcelain', { cwd, encoding: 'utf8' })

    return NextResponse.json({
      success: true,
      commitHash,
      lastCommit: lastCommit.trim(),
      committedFiles,
      remainingUncommitted: statusAfter || 'None (working tree clean)',
      envExcludedConfirmed: true,
      stagedList: stagedFiles.split('\n').filter(Boolean)
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stdout: err.stdout?.toString(),
      stderr: err.stderr?.toString()
    }, { status: 500 })
  }
}
