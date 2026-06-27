import { app, shell, dialog, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { MODEL_PRESETS } from './presets'
import {
  loadConfig,
  saveConfig,
  listProviders,
  getActiveProvider,
  upsertProvider,
  deleteProvider,
  setActiveProvider,
  addRecentProject,
  removeRecentProject
} from './config'
import {
  detectEnvironment,
  installClaudeCode,
  skipClaudeFirstRun,
  autoSetup
} from './environment'
import { installNode } from './node-installer'
import { installGit } from './git-installer'
import { launchClaudeCode } from './launcher'
import { createSession, writeSession, resizeSession, destroySession, destroyAllSessions } from './pty'
import { listMcpServers, upsertMcpServer, deleteMcpServer } from './mcp'
import { listClaudeProjects } from './projects'
import { listInstalledSkills, marketplaceSkills } from './skills'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'ClaudeOne',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function registerIpc(getWindow) {
  const send = (channel, payload) => getWindow()?.webContents.send(channel, payload)

  // —— 模型预设 ——
  ipcMain.handle('presets:list', () => MODEL_PRESETS)

  // —— 配置读写 ——
  ipcMain.handle('config:load', () => loadConfig())
  ipcMain.handle('config:save', (_e, partial) => saveConfig(partial))

  // —— Provider 管理 ——
  ipcMain.handle('provider:list', () => listProviders())
  ipcMain.handle('provider:active', () => getActiveProvider())
  ipcMain.handle('provider:upsert', (_e, p) => upsertProvider(p))
  ipcMain.handle('provider:delete', (_e, id) => deleteProvider(id))
  ipcMain.handle('provider:setActive', (_e, id) => setActiveProvider(id))

  // —— 环境检测 / 自动安装 ——
  ipcMain.handle('env:detect', () => detectEnvironment())

  // 启动时一键静默自检 + 自动安装（无独立按钮），进度走 env:installLog
  ipcMain.handle('env:autoSetup', () => autoSetup((chunk) => send('env:installLog', chunk)))

  // 以下保留：设置页「重新自检 / 手动修复」可单独调用
  ipcMain.handle('env:installNode', () => installNode((c) => send('env:installLog', c)))
  ipcMain.handle('env:installGit', () => installGit((c) => send('env:installLog', c)))
  ipcMain.handle('env:installClaude', () => installClaudeCode((c) => send('env:installLog', c)))
  ipcMain.handle('env:skipFirstRun', () => skipClaudeFirstRun())

  // —— Provider 连通性测试 ——
  ipcMain.handle('provider:test', async (_e, p) => testProvider(p))

  // —— 启动 Claude Code（系统终端）——
  ipcMain.handle('claude:launch', (_e, opts) => {
    // 未显式传 provider 时用当前激活的
    if (!opts || !opts.baseUrl) {
      const active = getActiveProvider()
      if (active) {
        opts = { ...active, cwd: opts?.cwd }
      }
    }
    return launchClaudeCode(opts || {})
  })

  // —— 内嵌终端（node-pty）——
  ipcMain.handle('terminal:create', (_e, opts) => {
    return createSession(
      opts,
      (data) => send('terminal:data', { id: opts.id, data }),
      (code) => send('terminal:exit', { id: opts.id, code })
    )
  })
  ipcMain.handle('terminal:write', (_e, { id, data }) => writeSession(id, data))
  ipcMain.handle('terminal:resize', (_e, { id, cols, rows }) => resizeSession(id, cols, rows))
  ipcMain.handle('terminal:destroy', (_e, { id }) => destroySession(id))

  // —— MCP 管理 ——
  ipcMain.handle('mcp:list', () => listMcpServers())
  ipcMain.handle('mcp:upsert', (_e, s) => upsertMcpServer(s))
  ipcMain.handle('mcp:delete', (_e, name) => deleteMcpServer(name))

  // —— 项目管理 ——
  ipcMain.handle('projects:listClaude', () => listClaudeProjects())
  ipcMain.handle('project:addRecent', (_e, { path, name }) => addRecentProject(path, name))
  ipcMain.handle('project:removeRecent', (_e, path) => removeRecentProject(path))
  ipcMain.handle('project:pickDir', async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win, {
      title: '选择工作目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || !res.filePaths.length) return null
    return res.filePaths[0]
  })

  // —— Skills 应用市场 ——
  ipcMain.handle('skills:installed', () => listInstalledSkills())
  ipcMain.handle('skills:marketplace', () => marketplaceSkills())

  // —— 通用 shell ——
  ipcMain.handle('shell:openExternal', (_e, url) => shell.openExternal(url))
  ipcMain.handle('shell:openPath', (_e, p) => shell.openPath(p))
}

// 轻量连通性测试：向 provider 的 Anthropic /v1/messages 发一个最小请求，
// 只判断「是否能连上 / Key 是否被接受」，不消耗有意义额度。
async function testProvider(p) {
  if (!p?.baseUrl || !p?.apiKey) {
    return { ok: false, message: '缺少 BASE URL 或 API Key' }
  }
  const base = p.baseUrl.replace(/\/$/, '')
  const url = `${base}/v1/messages`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': p.apiKey,
        'authorization': `Bearer ${p.apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: p.model || 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      })
    })
    clearTimeout(timer)
    if (res.ok) return { ok: true, message: `连接成功（HTTP ${res.status}）` }
    // 401/403 = Key 问题；其它 4xx 多为模型名/参数问题但说明端点可达
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `鉴权失败（HTTP ${res.status}），请检查 API Key` }
    }
    return { ok: true, message: `端点可达（HTTP ${res.status}），如报模型错误请核对模型名` }
  } catch (err) {
    return { ok: false, message: `连接失败：${err.message}` }
  }
}

let win = null

// 单实例锁：第二次启动不再开新窗口，而是激活已打开的窗口
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.claudeone.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    win = createWindow()
    registerIpc(() => win)

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        win = createWindow()
      }
    })
  })
}

app.on('before-quit', () => {
  destroyAllSessions()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
