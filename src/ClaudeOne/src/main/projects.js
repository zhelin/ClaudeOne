import { homedir } from 'os'
import { join } from 'path'
import { readdirSync, statSync, existsSync } from 'fs'

// 项目管理：
// 1) 扫描 Claude Code 的会话目录 ~/.claude/projects（每个子目录 = 一个工程的会话存档）
// 2) 配合 config.js 的 recentProjects 记录用户用 ClaudeOne 打开过的工作目录
//
// Claude Code 把工作目录路径编码成目录名（把路径分隔符换成 '-'）。这里尽量还原可读名。
function projectsRoot() {
  return join(homedir(), '.claude', 'projects')
}

// 把 Claude Code 编码后的目录名还原成大致可读的路径
function decodeProjectDir(name) {
  // 形如 C--Users-foo-myrepo → C:\Users\foo\myrepo（尽力还原，仅用于展示）
  return name.replace(/^([A-Za-z])--/, '$1:\\').replace(/-/g, '\\').replace(/\\\\/g, '\\')
}

// 列出 Claude Code 已有会话存档的工程
export function listClaudeProjects() {
  const root = projectsRoot()
  if (!existsSync(root)) return []
  let entries = []
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const result = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const dir = join(root, e.name)
    let sessionCount = 0
    let lastModified = 0
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
      sessionCount = files.length
      for (const f of files) {
        const m = statSync(join(dir, f)).mtimeMs
        if (m > lastModified) lastModified = m
      }
    } catch {
      // 忽略不可读目录
    }
    result.push({
      encodedName: e.name,
      displayPath: decodeProjectDir(e.name),
      sessionCount,
      lastModified
    })
  }
  return result.sort((a, b) => b.lastModified - a.lastModified)
}
