import { homedir } from 'os'
import { join } from 'path'
import { readdirSync, statSync, existsSync, readFileSync } from 'fs'

// Skills 管理：
// 1) 扫描本地已安装 Skills（~/.claude/skills/<name>/SKILL.md）
// 2) 提供一份精选「应用市场」清单（静态推荐位，点击跳源地址按说明安装）
//
// Skills 是 Claude Code 的能力扩展（含 SKILL.md 描述 + 资源）。这里只做读取与导览，
// 安装动作交给用户在终端执行或从源仓库拷入，避免 GUI 越权改动。
function skillsRoot() {
  return join(homedir(), '.claude', 'skills')
}

// 从 SKILL.md 的 YAML frontmatter 粗略提取 description（不引第三方 yaml 库）
function extractDescription(skillMdPath) {
  try {
    const text = readFileSync(skillMdPath, 'utf8')
    const m = text.match(/description:\s*(.+)/i)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    // 忽略
  }
  return ''
}

export function listInstalledSkills() {
  const root = skillsRoot()
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
    const md = join(root, e.name, 'SKILL.md')
    if (!existsSync(md)) continue
    let mtime = 0
    try {
      mtime = statSync(md).mtimeMs
    } catch {
      // 忽略
    }
    result.push({
      name: e.name,
      description: extractDescription(md),
      path: join(root, e.name),
      installedAt: mtime
    })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

// 精选 Skills 应用市场（静态推荐位；后续可改为远程拉取 skills.sh 索引）
export function marketplaceSkills() {
  return [
    {
      id: 'skills-sh',
      name: 'skills.sh 市场',
      description: '社区 Skills 聚合市场，浏览并按说明一键安装。',
      url: 'https://skills.sh'
    },
    {
      id: 'anthropic-skills',
      name: 'Anthropic 官方 Skills',
      description: 'Anthropic 官方与社区维护的 Claude Skills 合集。',
      url: 'https://github.com/anthropics/skills'
    },
    {
      id: 'awesome-claude',
      name: 'Awesome Claude Code',
      description: '精选 Claude Code 资源、Skills、MCP、提示词集合。',
      url: 'https://github.com/hesreallyhim/awesome-claude-code'
    }
  ]
}
