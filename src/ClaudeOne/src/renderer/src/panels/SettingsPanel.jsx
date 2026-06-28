import React, { useEffect, useRef, useState } from 'react'

// ⚙️ 设置：主题、重新自检环境。
export default function SettingsPanel({ config, applyTheme, onConfigChanged }) {
  const settings = config?.settings || {}
  const [theme, setTheme] = useState(settings.theme || 'dark')
  const [checking, setChecking] = useState(false)
  const [log, setLog] = useState('')
  const logRef = useRef(null)

  useEffect(() => {
    const off = window.api.onInstallLog((chunk) => {
      setLog((prev) => prev + chunk)
      requestAnimationFrame(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
      })
    })
    return off
  }, [])

  const changeTheme = async (t) => {
    setTheme(t)
    applyTheme(t)
    await window.api.saveConfig({ settings: { theme: t } })
    await onConfigChanged()
  }

  const recheck = async () => {
    setChecking(true)
    setLog('')
    await window.api.autoSetup()
    setChecking(false)
    await onConfigChanged()
  }

  return (
    <div className="page">
      <header className="page-head">
        <h2>设置</h2>
        <p className="page-sub">个性化与环境维护。</p>
      </header>

      <div className="card">
        <div className="card-title">外观</div>
        <div className="setting-row">
          <span className="setting-label">主题</span>
          <div className="seg">
            <button className={`seg-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => changeTheme('dark')}>
              暗色
            </button>
            <button className={`seg-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => changeTheme('light')}>
              亮色
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">环境维护</div>
        <p className="muted">重新检查并自动修复 Node.js / Git / Claude Code。</p>
        <button className="btn primary" disabled={checking} onClick={recheck}>
          {checking ? '检查中…' : '重新自检 / 修复'}
        </button>
        {(checking || log) && (
          <pre className="log" ref={logRef}>
            {log}
          </pre>
        )}
      </div>

      <div className="card">
        <div className="card-title">关于</div>
        <p className="muted">ClaudeOne · 一键安装 / 启动 Claude Code，对接国产大模型。</p>
      </div>
    </div>
  )
}
