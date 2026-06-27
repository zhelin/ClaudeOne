import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// MCP 服务器管理：直接读写 Claude Code 的 ~/.claude.json 里的 mcpServers 字段。
// 与 Claude Code CLI / 官方桌面端共用同一份配置，GUI 改动即时生效。
function claudeJsonPath() {
  return join(homedir(), '.claude.json')
}

function readClaudeJson() {
  const p = claudeJsonPath()
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

// 原子写入，避免写一半损坏全局配置
function writeClaudeJson(obj) {
  const p = claudeJsonPath()
  const tmp = p + '.tmp'
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8')
  // Windows 下 rename 覆盖已存在文件可能失败，先写 tmp 再覆盖
  writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8')
  try {
    if (existsSync(tmp)) writeFileSync(tmp, '', 'utf8')
  } catch {
    // 忽略清理失败
  }
}

// 列出 MCP 服务器，规整为数组：[{ name, type, command, args, url, env }]
export function listMcpServers() {
  const cfg = readClaudeJson()
  const servers = cfg.mcpServers || {}
  return Object.entries(servers).map(([name, def]) => ({
    name,
    type: def.type || (def.url ? 'http' : 'stdio'),
    command: def.command || '',
    args: Array.isArray(def.args) ? def.args : [],
    url: def.url || '',
    env: def.env || {}
  }))
}

// 新增 / 更新一个 MCP 服务器
export function upsertMcpServer(server) {
  const cfg = readClaudeJson()
  if (!cfg.mcpServers) cfg.mcpServers = {}

  const def = {}
  if (server.type === 'http' || server.type === 'sse') {
    def.type = server.type
    def.url = server.url || ''
  } else {
    def.type = 'stdio'
    def.command = server.command || ''
    if (server.args && server.args.length) def.args = server.args
  }
  if (server.env && Object.keys(server.env).length) def.env = server.env

  cfg.mcpServers[server.name] = def
  writeClaudeJson(cfg)
  return listMcpServers()
}

export function deleteMcpServer(name) {
  const cfg = readClaudeJson()
  if (cfg.mcpServers && cfg.mcpServers[name]) {
    delete cfg.mcpServers[name]
    writeClaudeJson(cfg)
  }
  return listMcpServers()
}
