import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync } from 'fs'
import { randomUUID } from 'crypto'

// 配置存储于用户目录，避免随程序更新丢失
function configPath() {
  return join(app.getPath('userData'), 'claudeone-config.json')
}
function backupPath() {
  return configPath() + '.bak'
}
function tempPath() {
  return configPath() + '.tmp'
}

// 配置 schema 版本：v2 = 多 provider 列表
const SCHEMA_VERSION = 2

function defaultConfig() {
  return {
    version: SCHEMA_VERSION,
    providers: [], // [{ id, presetId, name, baseUrl, apiKey, model, type }]
    activeProviderId: null,
    settings: {
      theme: 'dark', // dark | light
      language: 'zh', // zh | en
      terminalMode: 'embedded' // embedded | system
    },
    recentProjects: [] // [{ path, name, lastOpened }]
  }
}

function parseFile(p) {
  const raw = readFileSync(p, 'utf8')
  return JSON.parse(raw)
}

// 把旧版（v1，单一 { presetId, baseUrl, apiKey, model }）迁移成 v2 多 provider。
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return defaultConfig()

  // 已是 v2
  if (raw.version >= SCHEMA_VERSION && Array.isArray(raw.providers)) {
    const base = defaultConfig()
    return {
      ...base,
      ...raw,
      settings: { ...base.settings, ...(raw.settings || {}) },
      providers: raw.providers,
      recentProjects: Array.isArray(raw.recentProjects) ? raw.recentProjects : []
    }
  }

  // v1 → v2：把单条配置升级为一个 provider
  const cfg = defaultConfig()
  if (raw.baseUrl || raw.apiKey || raw.model) {
    const id = randomUUID()
    cfg.providers = [
      {
        id,
        presetId: raw.presetId || 'custom',
        name: raw.presetId || '已迁移配置',
        baseUrl: raw.baseUrl || '',
        apiKey: raw.apiKey || '',
        model: raw.model || '',
        type: 'anthropic'
      }
    ]
    // 配置可用即设为激活（模型名可选，留空用默认模型）
    if (raw.baseUrl && raw.apiKey) {
      cfg.activeProviderId = id
    }
  }
  return cfg
}

export function loadConfig() {
  const p = configPath()
  // 主文件优先
  if (existsSync(p)) {
    try {
      return migrate(parseFile(p))
    } catch {
      // 主文件损坏，回退备份
    }
  }
  // 回退到备份
  const bak = backupPath()
  if (existsSync(bak)) {
    try {
      return migrate(parseFile(bak))
    } catch {
      // 备份也损坏
    }
  }
  return defaultConfig()
}

// 原子写入：先写临时文件，再 rename 替换；保存前把上一份备份为 .bak
function writeConfig(next) {
  const p = configPath()
  const tmp = tempPath()
  if (existsSync(p)) {
    try {
      copyFileSync(p, backupPath())
    } catch {
      // 备份失败不阻断保存
    }
  }
  writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
  renameSync(tmp, p)
  return next
}

// 顶层合并保存（settings / activeProviderId / recentProjects 等）
export function saveConfig(partial) {
  const current = loadConfig()
  const next = {
    ...current,
    ...partial,
    settings: { ...current.settings, ...(partial.settings || {}) }
  }
  return writeConfig(next)
}

// —— Provider CRUD ——

export function listProviders() {
  return loadConfig().providers
}

export function getActiveProvider() {
  const cfg = loadConfig()
  return cfg.providers.find((p) => p.id === cfg.activeProviderId) || null
}

// 新增 / 更新一个 provider；不传 id 视为新增，返回保存后的完整配置与 id。
export function upsertProvider(provider) {
  const cfg = loadConfig()
  const list = [...cfg.providers]
  let id = provider.id
  if (id) {
    const idx = list.findIndex((p) => p.id === id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...provider }
    } else {
      list.push({ ...provider })
    }
  } else {
    id = randomUUID()
    list.push({ ...provider, id })
  }
  const next = { ...cfg, providers: list }
  // 第一个加入的 provider 自动设为激活
  if (!next.activeProviderId) {
    next.activeProviderId = id
  }
  writeConfig(next)
  return { config: next, id }
}

export function deleteProvider(id) {
  const cfg = loadConfig()
  const list = cfg.providers.filter((p) => p.id !== id)
  let activeProviderId = cfg.activeProviderId
  if (activeProviderId === id) {
    activeProviderId = list[0]?.id || null
  }
  return writeConfig({ ...cfg, providers: list, activeProviderId })
}

export function setActiveProvider(id) {
  const cfg = loadConfig()
  if (!cfg.providers.some((p) => p.id === id)) return cfg
  return writeConfig({ ...cfg, activeProviderId: id })
}

// —— 最近项目 ——

export function addRecentProject(projectPath, name) {
  const cfg = loadConfig()
  const list = cfg.recentProjects.filter((r) => r.path !== projectPath)
  list.unshift({ path: projectPath, name: name || projectPath, lastOpened: Date.now() })
  return writeConfig({ ...cfg, recentProjects: list.slice(0, 12) })
}

export function removeRecentProject(projectPath) {
  const cfg = loadConfig()
  const list = cfg.recentProjects.filter((r) => r.path !== projectPath)
  return writeConfig({ ...cfg, recentProjects: list })
}

