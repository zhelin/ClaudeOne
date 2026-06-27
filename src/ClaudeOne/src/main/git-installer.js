import { app } from 'electron'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// 打进安装包的 Git 安装文件名（请把官方 Git for Windows 安装包放到项目 build/ 目录下，并改成此名）
// 例如：把 Git-2.47.0-64-bit.exe 重命名为 git-installer.exe 放进 build/。
const INSTALLER_NAME = 'git-installer.exe'

// Git for Windows 默认安装目录（机器级安装的固定位置），装完后用来刷新本进程 PATH。
// git.exe 实际在 <安装目录>\cmd 下。
const DEFAULT_GIT_DIR = 'C:\\Program Files\\Git'
const DEFAULT_GIT_CMD = 'C:\\Program Files\\Git\\cmd'

// 解析随包携带的 Git 安装文件路径：
// - 生产环境：electron-builder 通过 extraResources 拷到 resources/ 下
// - 开发环境：直接读项目里的 build/ 目录
export function resolveGitInstaller() {
  const candidates = []
  if (process.resourcesPath) {
    candidates.push(join(process.resourcesPath, INSTALLER_NAME))
  }
  if (is.dev) {
    candidates.push(join(app.getAppPath(), 'build', INSTALLER_NAME))
    candidates.push(join(process.cwd(), 'build', INSTALLER_NAME))
  }
  return candidates.find((p) => existsSync(p)) || null
}

export function hasBundledGitInstaller() {
  return process.platform === 'win32' && !!resolveGitInstaller()
}

// 装完后把标准 Git 目录补进本进程 PATH，
// 这样无需重启 App 即可调用刚装好的 git。
function patchProcessPath() {
  if (process.platform !== 'win32') return
  if (existsSync(DEFAULT_GIT_CMD) && !process.env.PATH?.includes(DEFAULT_GIT_CMD)) {
    process.env.PATH = `${DEFAULT_GIT_CMD};${process.env.PATH || ''}`
  }
}

// 静默安装随包携带的 Git for Windows（不使用便携版，安装到系统标准位置）。
// 官方安装包基于 Inno Setup，支持 /VERYSILENT 全静默安装（不显示任何向导页 / 不需要点"下一步"）。
// 通过 PowerShell 以管理员身份（UAC 提权）运行，实现"自动点击安装"的效果。
export function installGit(onData) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      onData?.('当前仅支持 Windows 的内置 Git 安装。\n')
      return resolve({ success: false, code: -1, reason: 'unsupported-platform' })
    }

    const installer = resolveGitInstaller()
    if (!installer) {
      onData?.(`未找到随包的 Git 安装文件（${INSTALLER_NAME}）。\n`)
      return resolve({ success: false, code: -1, reason: 'installer-missing' })
    }

    onData?.(`正在安装 Git（来源：${installer}）…\n`)
    onData?.('将弹出系统授权（UAC）窗口，请点击"是"以继续。\n')

    // 以管理员身份运行 Inno Setup 安装包：
    //   /VERYSILENT      全静默（不显示向导页与进度窗口）
    //   /SUPPRESSMSGBOXES 抑制弹窗、对所有提示取默认值
    //   /NORESTART       不自动重启
    //   /NOCANCEL        禁用取消，避免误操作中断
    //   /SP-             跳过开头的 "This will install..." 确认
    // -Wait 等待结束，再用 $p.ExitCode 透传退出码。
    const psCommand = [
      '$ErrorActionPreference = "Stop";',
      `$p = Start-Process -FilePath "${installer}"`,
      `-ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NOCANCEL', '/SP-'`,
      '-Verb RunAs -PassThru -Wait;',
      'exit $p.ExitCode'
    ].join(' ')

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand],
      { windowsHide: true }
    )

    child.stdout.on('data', (d) => onData?.(d.toString()))
    child.stderr.on('data', (d) => onData?.(d.toString()))

    child.on('close', (code) => {
      // Inno Setup 退出码 0 = 成功
      const success = code === 0
      if (success) {
        patchProcessPath()
        onData?.('\n✓ Git 安装完成\n')
      } else {
        onData?.(`\n✗ Git 安装失败（code ${code}）\n`)
      }
      resolve({ success, code })
    })

    child.on('error', (err) => {
      onData?.(`\n[安装启动失败] ${err.message}\n`)
      resolve({ success: false, code: -1 })
    })
  })
}
