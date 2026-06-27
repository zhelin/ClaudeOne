import React, { useEffect, useState } from 'react'

// 🏠 工作台：当前 Provider 状态 + 选工作目录 + 一键启动 Claude Code + 最近项目快捷入口。
export default function Workbench({ activeProvider, config, onConfigChanged, runInTerminal, goTo }) {
  const [cwd, setCwd] = useState('')
  const recents = config?.recentProjects || []

  useEffect(() => {
    if (!cwd && recents[0]) setCwd(recents[0].path)
  }, [recents, cwd])

  const pickDir = async () => {
    const dir = await window.api.pickDir()
    if (dir) {
      setCwd(dir)
      const name = dir.split(/[\\/]/).pop()
      await window.api.addRecentProject(dir, name)
      await onConfigChanged()
    }
  }

  const launchSystem = async () => {
    await window.api.launchClaude({ ...activeProvider, cwd })
  }

  const maskedKey = activeProvider?.apiKey
    ? '••••••' + activeProvider.apiKey.slice(-4)
    : '未填写'

  return (
    <div className="page">
      <header className="page-head">
        <h2>工作台</h2>
        <p className="page-sub">选择工作目录，一键启动 Claude Code。</p>
      </header>

      {!activeProvider ? (
        <div className="hint warn">
          尚未配置可用的 Provider。请到「模型 Provider」页添加并激活一个模型。
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => goTo('providers')}>
              去配置
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card status-card">
            <div className="status-head">
              <span className="badge">当前模型</span>
              <strong>{activeProvider.name}</strong>
              <button className="link-btn" onClick={() => goTo('providers')}>
                切换 / 修改
              </button>
            </div>
            <div className="kv">
              <span>BASE URL</span>
              <code>{activeProvider.baseUrl}</code>
            </div>
            <div className="kv">
              <span>模型</span>
              <code>{activeProvider.model}</code>
            </div>
            <div className="kv">
              <span>API Key</span>
              <code>{maskedKey}</code>
            </div>
          </div>

          <div className="card">
            <div className="field-row">
              <label className="field-label">工作目录</label>
              <div className="field-input-row">
                <input
                  className="text-input"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="选择或粘贴一个项目目录（留空则用主目录）"
                />
                <button className="btn ghost" onClick={pickDir}>
                  浏览…
                </button>
              </div>
            </div>

            <div className="launch-row">
              <button className="btn primary big" onClick={() => runInTerminal(cwd)}>
                💻 在内嵌终端启动
              </button>
              <button className="btn big" onClick={launchSystem}>
                🪟 用系统终端启动
              </button>
            </div>
          </div>
        </>
      )}

      {recents.length > 0 && (
        <div className="card">
          <div className="card-title">最近项目</div>
          <div className="recent-list">
            {recents.map((r) => (
              <div key={r.path} className="recent-item">
                <div className="recent-info" onClick={() => setCwd(r.path)}>
                  <div className="recent-name">{r.name}</div>
                  <div className="recent-path">{r.path}</div>
                </div>
                <button
                  className="btn ghost sm"
                  disabled={!activeProvider}
                  onClick={() => runInTerminal(r.path)}
                >
                  启动
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
