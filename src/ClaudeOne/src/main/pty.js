import { spawn as ptySpawn } from 'node-pty'
import { homedir } from 'os'
import { anthropicEnvVars } from './anthropic-env'

// 内嵌终端会话管理：用 node-pty 起一个真实 PTY，跑 claude（或普通 shell），
// 数据通过回调流回渲染层的 xterm.js。支持多会话（按 id 区分）。
const sessions = new Map()

const isWin = process.platform === 'win32'

function defaultShell() {
  if (isWin) return process.env.COMSPEC || 'cmd.exe'
  return process.env.SHELL || '/bin/bash'
}

// 创建一个终端会话。
// opts: { id, cwd, provider, runClaude, skipPermissions }
//   provider: { baseUrl, apiKey, model, haikuModel } —— 注入 ANTHROPIC_* 环境变量
//   runClaude: true 则直接启动 claude；false 则只开一个 shell
//   skipPermissions: true 则启动 claude 时追加 --dangerously-skip-permissions
function buildEnv(provider) {
  return { ...process.env, ...anthropicEnvVars(provider) }
}

export function createSession({ id, cwd, provider, runClaude, skipPermissions }, onData, onExit) {
  if (sessions.has(id)) {
    destroySession(id)
  }

  const shell = defaultShell()
  const env = buildEnv(provider)
  const workdir = cwd || process.env.USERPROFILE || homedir()

  // 用 shell 拉起，便于解析 claude(.cmd) 并保留交互式提示符
  const args = isWin ? [] : []
  const pty = ptySpawn(shell, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: workdir,
    env
  })

  pty.onData((data) => onData?.(data))
  pty.onExit(({ exitCode }) => {
    sessions.delete(id)
    onExit?.(exitCode)
  })

  sessions.set(id, pty)

  // 需要直接进入 claude TUI 时，写入启动命令
  if (runClaude) {
    const flag = skipPermissions ? ' --dangerously-skip-permissions' : ''
    const cmd = isWin ? `claude${flag}\r` : `claude${flag}\n`
    pty.write(cmd)
  }

  return { success: true }
}

export function writeSession(id, data) {
  const pty = sessions.get(id)
  if (pty) {
    pty.write(data)
    return true
  }
  return false
}

export function resizeSession(id, cols, rows) {
  const pty = sessions.get(id)
  if (pty) {
    try {
      pty.resize(Math.max(cols, 1), Math.max(rows, 1))
    } catch {
      // 忽略 resize 失败
    }
    return true
  }
  return false
}

export function destroySession(id) {
  const pty = sessions.get(id)
  if (pty) {
    try {
      pty.kill()
    } catch {
      // 忽略
    }
    sessions.delete(id)
    return true
  }
  return false
}

export function destroyAllSessions() {
  for (const id of sessions.keys()) {
    destroySession(id)
  }
}
