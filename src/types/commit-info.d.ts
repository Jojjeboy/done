export interface CommitInfo {
  hash: string
  message: string
  timestamp: string
  author: string
}

export interface CommitData {
  latest: CommitInfo
  repoUrl: string
  commits: CommitInfo[]
}
