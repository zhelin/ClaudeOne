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

// 在 PATH 里找不到 claude 时，回退到 npm 全局安装目录直接探测其 shim。
// 场景：刚装完 Node/Claude Code 的全新系统，npm 全局 bin 目录（Windows: %AppData%\npm）
// 尚未进入当前 Electron 进程启动时捕获的 PATH，导致 `claude --version` 找不到命令。
async function tryClaudeViaGlobalPrefix() {
  try {
    const { stdout } = await execAsync(`${isWin ? 'npm.cmd' : 'npm'} prefix -g`, {
      windowsHide: true,
      shell: isWin,
      timeout: 15000
    })
    const prefix = stdout.trim()
    // Windows：<prefix>\claude.cmd；类 Unix：<prefix>/bin/claude
    const claudeBin = isWin ? join(prefix, 'claude.cmd') : join(prefix, 'bin', 'claude')
    if (!existsSync(claudeBin)) return null
    return await tryVersion(`"${claudeBin}" --version`)
  } catch {
    return null
  }
}

// 检测 Node / npm / Git / Claude Code 安装状态
export async function detectEnvironment() {
  const [node, npm, git, claudeOnPath] = await Promise.all([
    tryVersion('node --version'),
    tryVersion('npm --version'),
    tryVersion('git --version'),
    tryVersion('claude --version')
  ])

  // PATH 没找到时回退到 npm 全局目录探测，避免「装好了但判定未就绪」
  const claude = claudeOnPath || (await tryClaudeViaGlobalPrefix())

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

// 手动补跑 Claude Code 的 postinstall（install.cjs）。
// 新版 npm（11.6+，随 Node 24 一起发布）默认启用 "allow-scripts" 安全特性，
// 会拦截依赖包的 postinstall 生命周期脚本（日志里出现 `npm warn allow-scripts`）。
// 而 @anthropic-ai/claude-code 正是靠 postinstall 的 `node install.cjs` 下载/链接真正的
// 原生 CLI 可执行文件；被拦截后包文件虽在、但 `claude --version` 不可用 → 环境判定未就绪。
// 这里在 npm 安装完成后，定位全局包目录并主动跑一次 install.cjs，绕过该拦截。
async function runClaudePostinstall(onData) {
  try {
    const { stdout } = await execAsync(`${isWin ? 'npm.cmd' : 'npm'} root -g`, {
      windowsHide: true,
      shell: isWin,
      timeout: 15000
    })
    const globalRoot = stdout.trim()
    const pkgDir = join(globalRoot, '@anthropic-ai', 'claude-code')
    const installScript = join(pkgDir, 'install.cjs')
    if (!existsSync(installScript)) {
      // 旧版本可能没有该脚本（postinstall 非必需），直接跳过
      return
    }
    onData('\n正在完成 Claude Code 原生组件安装（补跑 postinstall）…\n')
    await new Promise((res) => {
      const c = spawn(isWin ? 'node.exe' : 'node', [installScript], {
        cwd: pkgDir,
        windowsHide: true,
        shell: isWin
      })
      c.stdout.on('data', (d) => onData(d.toString()))
      c.stderr.on('data', (d) => onData(d.toString()))
      c.on('close', () => res())
      c.on('error', (err) => {
        onData(`（提示）补跑 postinstall 失败：${err.message}\n`)
        res()
      })
    })
  } catch (err) {
    onData(`（提示）定位 Claude Code 全局目录失败：${err.message}\n`)
  }
}

// 一键安装 Claude Code，流式回传安装日志；装完自动设置"跳过初次确认"
export function installClaudeCode(onData) {
  return new Promise((resolve) => {
    const child = spawn(
      isWin ? 'npm.cmd' : 'npm',
      // --foreground-scripts：让 postinstall 在前台执行并回显日志；
      // 部分新版 npm 仍会因 allow-scripts 拦截，故下方再主动补跑一次 install.cjs 兜底。
      [
        'install',
        '-g',
        '@anthropic-ai/claude-code',
        `--registry=${NPM_REGISTRY}`,
        '--foreground-scripts'
      ],
      { windowsHide: true, shell: isWin }
    )

    child.stdout.on('data', (d) => onData(d.toString()))
    child.stderr.on('data', (d) => onData(d.toString()))

    child.on('close', async (code) => {
      const success = code === 0
      if (success) {
        // 关键修复：补跑被 npm allow-scripts 拦截的 postinstall，确保原生 CLI 可用
        await runClaudePostinstall(onData)
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
