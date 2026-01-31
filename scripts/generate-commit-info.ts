import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CommitInfo {
  hash: string
  message: string
  timestamp: string
  author: string
}

interface CommitData {
  latest: CommitInfo
  repoUrl: string
  commits: CommitInfo[]
}

function getCommitData(): CommitData {
  try {
    // Get the last 50 commits (increased from 10 to ensure more entries are visible)
    const gitLog = execSync(
      'git log -50 --pretty=format:"%h|%s|%ai|%an"',
      { encoding: 'utf-8' }
    )

    // Get repository URL
    let repoUrl = 'https://github.com/Jojjeboy/done'
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
      }).trim()

      // Convert git URL to https URL if needed
      if (remoteUrl.includes('github.com')) {
        repoUrl = remoteUrl
          .replace('git@github.com:', 'https://github.com/')
          .replace(/\.git$/, '')
      }
    } catch {
      console.warn('Could not get remote URL, using default:', repoUrl)
    }

    // Parse commits
    const commits: CommitInfo[] = gitLog
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, message, timestamp, author] = line.split('|')
        return { hash, message, timestamp, author }
      })

    const latest = commits[0] || {
      hash: 'unknown',
      message: 'No commits found',
      timestamp: new Date().toISOString(),
      author: 'Unknown',
    }

    return {
      latest,
      repoUrl,
      commits,
    }
  } catch (error) {
    console.warn('Git is not available or not a git repository:', error)
    // Return placeholder data if git is not available
    return {
      latest: {
        hash: 'dev',
        message: 'Development build',
        timestamp: new Date().toISOString(),
        author: 'Developer',
      },
      repoUrl: 'https://github.com/Jojjeboy/done',
      commits: [],
    }
  }
}

function main() {
  console.log('Generating commit info...')

  const commitData = getCommitData()
  const outputDir = join(__dirname, '..', 'src', 'generated')
  const outputPath = join(outputDir, 'commit-info.json')

  // Ensure the directory exists
  mkdirSync(outputDir, { recursive: true })

  // Write the commit data
  writeFileSync(outputPath, JSON.stringify(commitData, null, 2), 'utf-8')

  console.log(`✓ Generated commit info with ${commitData.commits.length} commits`)
  console.log(`  Latest: ${commitData.latest.hash} - ${commitData.latest.message}`)
}

main()
