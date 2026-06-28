import React, { useEffect, useState } from 'react'

// 💻 终端：用系统自带终端窗口启动 Claude Code（注入当前 Provider 环境变量）。
export default function TerminalPanel({ activeProvider, initialCwd }) {
  const [cwd, setCwd] = useState(initialCwd || '')

  useEffect(() => {
    setCwd(initialCwd || '')
  }, [initialCwd])

  const launchSystem = async () => {
    await window.api.launchClaude({ ...(activeProvider || {}), cwd: cwd || undefined })
  }

  return (
    <div className="page term-page">
      <header className="page-head">
        <div>
          <h2>终端</h2>
          <p className="page-sub">
            {activeProvider ? `当前模型：${activeProvider.name}` : '未配置 Provider'}
          </p>
        </div>
      </header>

      <div className="card">
        <p className="muted">将在系统自带终端窗口中启动 Claude Code（注入当前 Provider 环境变量）。</p>
        <div className="field-input-row" style={{ marginTop: 12 }}>
          <input
            className="text-input"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            placeholder="工作目录（留空则用主目录）"
          />
          <button className="btn primary" onClick={launchSystem} disabled={!activeProvider}>
            🪟 用系统终端启动
          </button>
        </div>
      </div>
    </div>
  )
}
