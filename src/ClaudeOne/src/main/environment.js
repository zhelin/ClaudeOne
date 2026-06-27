import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { hasBundledNodeInstaller, installNode } from './node-installer'
import { hasBundledGitInstaller, installGit } from './git-installer'

const execAsync = promisify(exec)

// Windows 下需要 shell 才能解析 .cmd（npm、claude 等）
const isWin = process.platform === 'win32'

// 国内 npm 镜像，安装更快更稳（与保姆级教程一致）
const NPM_REGISTRY = 'https://registry.npmmirror.com'

async function tryVersion(cmd) {
  try {
    const { stdout } = await execAsync(cmd, { windowsHide: true, timeout: 15000 })
    return stdout.trim()
  } catch {
    return null
  }
}

// 检测 Node / npm / Git / Claude Code 安装状态
export async function detectEnvironment() {
  const [node, npm, git, claude] = await Promise.all([
    tryVersion('node --version'),
    tryVersion('npm --version'),
    tryVersion('git --version'),
    tryVersion('claude --version')
  ])

  return {
    node: { installed: !!node, version: node },
    npm: { installed: !!npm, version: npm },
    git: { installed: !!git, version: git },
    claude: { installed: !!claude, version: claude },
    // 是否随包携带了 Node 安装文件 —— 决定前端显示「一键安装 Node.js」还是「去官网下载」
    bundledNode: hasBundledNodeInstaller(),
    // 是否随包携带了 Git 安装文件 —— 决定前端显示「一键安装 Git」还是「去官网下载」
    bundledGit: hasBundledGitInstaller()
  }
}

// 跳过 Claude Code 初次安装确认：
// 往 ~/.claude.json 写入 hasCompletedOnboarding，避免首次启动卡在欢迎/确认页。
// 与 cc-switch「跳过 Claude Code 初次安装确认」开关同义。
export function skipClaudeFirstRun() {
  try {
    const p = join(homedir(), '.claude.json')
    let cfg = {}
    if (existsSync(p)) {
      try {
        cfg = JSON.parse(readFileSync(p, 'utf8'))
      } catch {
        cfg = {}
      }
    }
    cfg.hasCompletedOnboarding = true
    // 部分版本用此字段记录已读引导提示，一并写入更稳妥
    if (typeof cfg.bypassPermissionsModeAccepted === 'undefined') {
      cfg.bypassPermissionsModeAccepted = false
    }
    writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 一键安装 Claude Code，流式回传安装日志；装完自动设置"跳过初次确认"
export function installClaudeCode(onData) {
  return new Promise((resolve) => {
    const child = spawn(
      isWin ? 'npm.cmd' : 'npm',
      ['install', '-g', '@anthropic-ai/claude-code', `--registry=${NPM_REGISTRY}`],
      { windowsHide: true, shell: isWin }
    )

    child.stdout.on('data', (d) => onData(d.toString()))
    child.stderr.on('data', (d) => onData(d.toString()))

    child.on('close', (code) => {
      const success = code === 0
      if (success) {
        const r = skipClaudeFirstRun()
        onData(
          r.success
            ? '\n✓ 已默认开启"跳过 Claude Code 初次安装确认"\n'
            : `\n（提示）设置跳过初次确认失败：${r.error}\n`
        )
      }
      resolve({ success, code })
    })
    child.on('error', (err) => {
      onData(`\n[启动失败] ${err.message}\n`)
      resolve({ success: false, code: -1 })
    })
  })
}

// 预置 Claude Code 用户级默认设置（~/.claude/settings.json）：
//   permissions.defaultMode = acceptEdits —— 默认自动批准文件编辑，Bash 仍会询问一次；
//   disableAutoMode = disable        —— 移除 auto 模式，避开第三方模型不支持安全分类器
//                                       导致的“Bash 被拦截 / temporarily unavailable”问题。
// 采用合并写入，不覆盖用户已有的其他设置。
export function ensureClaudeSettings() {
  try {
    const dir = join(homedir(), '.claude')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const p = join(dir, 'settings.json')
    let cfg = {}
    if (existsSync(p)) {
      try {
        cfg = JSON.parse(readFileSync(p, 'utf8'))
      } catch {
        cfg = {}
      }
    }
    cfg.permissions = { ...(cfg.permissions || {}) }
    // 仅在用户未显式设过时写入，尊重用户已有选择
    if (!cfg.permissions.defaultMode) cfg.permissions.defaultMode = 'acceptEdits'
    cfg.disableAutoMode = 'disable'
    writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 一键自动自检 + 静默安装：无独立按钮，App 启动时直接调用。
// 流程：检测 → 缺 Node 自动装 → 缺 Git 自动装 → 缺 Claude Code 自动装 → 复检。
// 通过 onData 流式上报进度，返回最终 { ready, env }。
// ready = Node + Claude Code 均就绪（Git 为可选增强，缺失不阻断）。
export async function autoSetup(onData) {
  const log = (s) => onData?.(s)

  log('开始检查本地环境…\n')
  let env = await detectEnvironment()

  // 1) Node.js（Claude Code 运行必需）
  if (!env.node.installed) {
    if (env.bundledNode) {
      log('\n未检测到 Node.js，正在自动安装（随包内置，静默）…\n')
      await installNode(log)
    } else {
      log('\n未检测到 Node.js，且未随包携带安装文件。请到 https://nodejs.org 安装后重试。\n')
    }
    env = await detectEnvironment()
  } else {
    log(`✓ Node.js 已就绪（${env.node.version}）\n`)
  }

  // 2) Git（部分功能依赖，可选增强）
  if (!env.git.installed) {
    if (env.bundledGit) {
      log('\n未检测到 Git，正在自动安装（随包内置，静默）…\n')
      await installGit(log)
      env = await detectEnvironment()
    } else {
      log('（提示）未检测到 Git，部分功能受限，可稍后到 https://git-scm.com 安装。\n')
    }
  } else {
    log(`✓ Git 已就绪（${env.git.version}）\n`)
  }

  // 3) Claude Code（核心）—— 仅当 Node 就绪时才安装
  if (env.node.installed && !env.claude.installed) {
    log('\n未检测到 Claude Code，正在自动安装（国内镜像）…\n')
    await installClaudeCode(log)
    env = await detectEnvironment()
  } else if (env.claude.installed) {
    log(`✓ Claude Code 已就绪（${env.claude.version}）\n`)
  }

  const ready = env.node.installed && env.claude.installed
  if (ready) {
    const r = ensureClaudeSettings()
    log(
      r.success
        ? '✓ 已写入 Claude Code 默认设置（acceptEdits + 禁用 auto 模式）\n'
        : `（提示）写入 Claude Code 默认设置失败：${r.error}\n`
    )
  }
  log(ready ? '\n✓ 环境就绪\n' : '\n环境尚未就绪，请查看上方日志。\n')
  return { ready, env }
}
