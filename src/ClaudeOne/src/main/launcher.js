import { spawn } from 'child_process'
import { homedir } from 'os'
import { anthropicEnvVars } from './anthropic-env'

// 启动 Claude Code：注入 ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN 及三档模型映射，
// 在一个新的系统终端窗口中拉起 claude（交互式 TUI 需要真实终端）。
// 跨平台：Windows 用 cmd start；macOS 用 osascript 唤起 Terminal.app；Linux 尝试常见终端。
export function launchClaudeCode(provider = {}) {
  const { cwd, skipPermissions } = provider
  const anthropicVars = anthropicEnvVars(provider)
  const env = { ...process.env, ...anthropicVars }

  const workdir = cwd || process.env.USERPROFILE || homedir()

  // 是否追加 --dangerously-skip-permissions（跳过所有权限确认，按工作目录单独决定）
  const claudeCmd = skipPermissions ? 'claude --dangerously-skip-permissions' : 'claude'
  const claudeArgv = skipPermissions ? ['claude', '--dangerously-skip-permissions'] : ['claude']

  if (process.platform === 'win32') {
    // 静默弹出独立 PowerShell 窗口：定位到工作目录并启动 claude（交互式 TUI 需真实终端）。
    // 环境变量经 env 注入由子进程继承，不拼进命令行；PowerShell 单引号路径转义为两个单引号。
    const psPath = String(workdir).replace(/'/g, "''")
    const inner = `Set-Location -LiteralPath '${psPath}'; ${claudeCmd}`
    // 用 windowsVerbatimArguments 自行拼接命令行，避免 Node 把 start 的标题引号转义成 \" 而出错。
    // start 的第一个带引号参数会被当作窗口标题；标题必须用双引号包裹，
    // 否则 start 会把 ClaudeOne 当作要运行的程序 → "Windows cannot find 'ClaudeOne'"。
    const innerEscaped = inner.replace(/"/g, '\\"')
    // 关键：加 -ExecutionPolicy Bypass，否则 PowerShell 会因执行策略拦截 npm 安装的未签名 claude.ps1
    // （报错"在此系统上禁止运行脚本"）。Bypass 仅对本进程生效，不改系统设置、无需管理员提权。
    const cmdLine = `/c start "ClaudeOne" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "${innerEscaped}"`
    const child = spawn('cmd.exe', [cmdLine], {
      cwd: workdir,
      env,
      detached: true,
      windowsHide: false,
      windowsVerbatimArguments: true
    })
    child.unref()
    return { success: true }
  }

  if (process.platform === 'darwin') {
    // macOS：用 AppleScript 让 Terminal.app 打开新窗口，先 cd 工作目录并注入环境变量再运行 claude。
    // 用单引号包裹值，转义其中的单引号。
    const esc = (v) => String(v || '').replace(/'/g, `'\\''`)
    const exports = Object.entries(anthropicVars)
      .map(([k, v]) => `export ${k}='${esc(v)}'; `)
      .join('')
    const inner = `cd '${esc(workdir)}'; ` + exports + claudeCmd
    const script = `tell application "Terminal" to do script "${inner.replace(/"/g, '\\"')}"\n` +
      `tell application "Terminal" to activate`
    const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' })
    child.unref()
    return { success: true }
  }

  // Linux：尝试常见终端模拟器；失败则 detached 直接起 claude
  const terminals = [
    ['x-terminal-emulator', ['-e', ...claudeArgv]],
    ['gnome-terminal', ['--', ...claudeArgv]],
    ['konsole', ['-e', ...claudeArgv]],
    ['xterm', ['-e', ...claudeArgv]]
  ]
  for (const [term, args] of terminals) {
    try {
      const child = spawn(term, args, { cwd: workdir, env, detached: true, stdio: 'ignore' })
      child.unref()
      return { success: true }
    } catch {
      // 尝试下一个
    }
  }
  const fallback = spawn('claude', claudeArgv.slice(1), { cwd: workdir, env, detached: true, stdio: 'ignore' })
  fallback.unref()
  return { success: true }
}
