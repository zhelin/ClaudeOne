import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露给渲染进程的安全 API（白名单）
const api = {
  // 预设 / 配置
  listPresets: () => ipcRenderer.invoke('presets:list'),
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),

  // Provider 管理
  listProviders: () => ipcRenderer.invoke('provider:list'),
  getActiveProvider: () => ipcRenderer.invoke('provider:active'),
  upsertProvider: (p) => ipcRenderer.invoke('provider:upsert', p),
  deleteProvider: (id) => ipcRenderer.invoke('provider:delete', id),
  setActiveProvider: (id) => ipcRenderer.invoke('provider:setActive', id),
  testProvider: (p) => ipcRenderer.invoke('provider:test', p),

  // 环境检测 / 自动安装
  detectEnv: () => ipcRenderer.invoke('env:detect'),
  autoSetup: () => ipcRenderer.invoke('env:autoSetup'),
  installNode: () => ipcRenderer.invoke('env:installNode'),
  installGit: () => ipcRenderer.invoke('env:installGit'),
  installClaude: () => ipcRenderer.invoke('env:installClaude'),
  skipFirstRun: () => ipcRenderer.invoke('env:skipFirstRun'),
  onInstallLog: (cb) => {
    const listener = (_e, chunk) => cb(chunk)
    ipcRenderer.on('env:installLog', listener)
    return () => ipcRenderer.removeListener('env:installLog', listener)
  },

  // 系统终端启动
  launchClaude: (opts) => ipcRenderer.invoke('claude:launch', opts),

  // 内嵌终端（node-pty）
  termCreate: (opts) => ipcRenderer.invoke('terminal:create', opts),
  termWrite: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
  termResize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
  termDestroy: (id) => ipcRenderer.invoke('terminal:destroy', { id }),
  onTermData: (cb) => {
    const listener = (_e, payload) => cb(payload)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },
  onTermExit: (cb) => {
    const listener = (_e, payload) => cb(payload)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  },

  // MCP
  listMcp: () => ipcRenderer.invoke('mcp:list'),
  upsertMcp: (s) => ipcRenderer.invoke('mcp:upsert', s),
  deleteMcp: (name) => ipcRenderer.invoke('mcp:delete', name),

  // 项目
  listClaudeProjects: () => ipcRenderer.invoke('projects:listClaude'),
  addRecentProject: (path, name) => ipcRenderer.invoke('project:addRecent', { path, name }),
  removeRecentProject: (path) => ipcRenderer.invoke('project:removeRecent', path),
  pickDir: () => ipcRenderer.invoke('project:pickDir'),

  // Skills
  listInstalledSkills: () => ipcRenderer.invoke('skills:installed'),
  marketplaceSkills: () => ipcRenderer.invoke('skills:marketplace'),

  // 通用
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
