import React, { useEffect, useState, useCallback } from 'react'
import Workbench from '../panels/Workbench'
import Providers from '../panels/Providers'
import TerminalPanel from '../panels/TerminalPanel'
import ProjectsPanel from '../panels/ProjectsPanel'
import McpPanel from '../panels/McpPanel'
import SkillsPanel from '../panels/SkillsPanel'
import SettingsPanel from '../panels/SettingsPanel'

const NAV = [
  { id: 'workbench', label: '工作台', icon: '🏠' },
  { id: 'providers', label: '模型 Provider', icon: '🧩' },
  { id: 'terminal', label: '终端', icon: '💻' },
  { id: 'projects', label: '项目', icon: '🗂️' },
  { id: 'mcp', label: 'MCP', icon: '🔌' },
  { id: 'skills', label: 'Skills 市场', icon: '✨' },
  { id: 'settings', label: '设置', icon: '⚙️' }
]

export default function MainApp({ config, refreshConfig, applyTheme }) {
  const [active, setActive] = useState('workbench')
  const [activeProvider, setActiveProvider] = useState(null)

  const reloadActiveProvider = useCallback(async () => {
    const p = await window.api.getActiveProvider()
    setActiveProvider(p)
  }, [])

  useEffect(() => {
    reloadActiveProvider()
  }, [reloadActiveProvider, config])

  // 子面板改动配置后统一刷新
  const onConfigChanged = useCallback(async () => {
    await refreshConfig()
    await reloadActiveProvider()
  }, [refreshConfig, reloadActiveProvider])

  // 「在终端运行」：切到终端页并请求自动启动 claude
  const [terminalAutoRun, setTerminalAutoRun] = useState(0)
  const [terminalCwd, setTerminalCwd] = useState('')
  const runInTerminal = useCallback((cwd) => {
    setTerminalCwd(cwd || '')
    setTerminalAutoRun((n) => n + 1)
    setActive('terminal')
  }, [])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C1</span>
          <span className="brand-name">ClaudeOne</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? 'active' : ''}`}
              onClick={() => setActive(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="active-provider" title={activeProvider?.baseUrl || ''}>
            <span className="dot ok" />
            <span className="ap-name">
              {activeProvider ? activeProvider.name : '未配置 Provider'}
            </span>
          </div>
        </div>
      </aside>

      <main className="panel">
        {active === 'workbench' && (
          <Workbench
            activeProvider={activeProvider}
            config={config}
            onConfigChanged={onConfigChanged}
            runInTerminal={runInTerminal}
            goTo={setActive}
          />
        )}
        {active === 'providers' && (
          <Providers onConfigChanged={onConfigChanged} />
        )}
        {/* 终端常驻挂载，切换标签页时隐藏而非卸载，保留会话 */}
        <div
          className="term-mount"
          style={{ display: active === 'terminal' ? 'flex' : 'none' }}
        >
          <TerminalPanel
            activeProvider={activeProvider}
            config={config}
            autoRunSignal={terminalAutoRun}
            initialCwd={terminalCwd}
            visible={active === 'terminal'}
          />
        </div>
        {active === 'projects' && (
          <ProjectsPanel
            config={config}
            onConfigChanged={onConfigChanged}
            runInTerminal={runInTerminal}
          />
        )}
        {active === 'mcp' && <McpPanel />}
        {active === 'skills' && <SkillsPanel />}
        {active === 'settings' && (
          <SettingsPanel
            config={config}
            applyTheme={applyTheme}
            onConfigChanged={onConfigChanged}
          />
        )}
      </main>
    </div>
  )
}
