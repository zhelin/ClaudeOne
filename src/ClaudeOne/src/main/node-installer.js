import { app } from 'electron'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// 打进安装包的 Node.js 安装文件名（请把官方 .msi 放到项目 build/ 目录下，并改成此名）
// 例如：把 node-v20.19.5-x64.msi 重命名为 node-installer.msi 放进 build/。
const INSTALLER_NAME = 'node-installer.msi'

// Node.js 默认安装目录（msiexec 机器级安装的固定位置），装完后用来刷新本进程 PATH
const DEFAULT_NODE_DIR = 'C:\\Program Files\\nodejs'

// 解析随包携带的 Node 安装文件路径：
// - 生产环境：electron-builder 通过 extraResources 拷到 resources/ 下
// - 开发环境：直接读项目里的 build/ 目录
export function resolveNodeInstaller() {
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

export function hasBundledNodeInstaller() {
  return process.platform === 'win32' && !!resolveNodeInstaller()
}

// 装完后把标准 Node 目录补进本进程 PATH，
// 这样无需重启 App 即可调用刚装好的 node / npm / npx。
function patchProcessPath() {
  if (process.platform !== 'win32') return
  if (existsSync(DEFAULT_NODE_DIR) && !process.env.PATH?.includes(DEFAULT_NODE_DIR)) {
    process.env.PATH = `${DEFAULT_NODE_DIR};${process.env.PATH || ''}`
  }
}

// 静默安装随包携带的 Node.js（不使用私有/便携版，安装到系统标准位置）。
// 通过 PowerShell 以管理员身份（UAC 提权）运行 msiexec 的被动安装（/passive 只显示进度条，
// 不需要用户点任何"下一步"），实现"自动点击安装"的效果。
export function installNode(onData) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      onData?.('当前仅支持 Windows 的内置 Node 安装。\n')
      return resolve({ success: false, code: -1, reason: 'unsupported-platform' })
    }

    const installer = resolveNodeInstaller()
    if (!installer) {
      onData?.(`未找到随包的 Node 安装文件（${INSTALLER_NAME}）。\n`)
      return resolve({ success: false, code: -1, reason: 'installer-missing' })
    }

    onData?.(`正在安装 Node.js（来源：${installer}）…\n`)
    onData?.('将弹出系统授权（UAC）窗口，请点击"是"以继续。\n')

    // 以管理员身份运行 msiexec：/passive 被动安装（仅进度条）、/norestart 不自动重启。
    // -Wait 等待结束，再用 $p.ExitCode 透传退出码。
    const psCommand = [
      '$ErrorActionPreference = "Stop";',
      `$p = Start-Process -FilePath "msiexec.exe"`,
      `-ArgumentList '/i', '"${installer}"', '/passive', '/norestart'`,
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
      // msiexec 退出码 0 = 成功，3010 = 成功但需重启
      const success = code === 0 || code === 3010
      if (success) {
        patchProcessPath()
        onData?.('\n✓ Node.js 安装完成\n')
      } else {
        onData?.(`\n✗ Node.js 安装失败（code ${code}）\n`)
      }
      resolve({ success, code })
    })

    child.on('error', (err) => {
      onData?.(`\n[安装启动失败] ${err.message}\n`)
      resolve({ success: false, code: -1 })
    })
  })
}
