import React, { useEffect, useState, useCallback } from 'react'

// 🗂️ 项目：最近用过的工作目录 + Claude Code 已有会话存档（~/.claude/projects）。
export default function ProjectsPanel({ config, onConfigChanged, runInTerminal }) {
  const [claudeProjects, setClaudeProjects] = useState([])
  const recents = config?.recentProjects || []

  const reload = useCallback(async () => {
    const list = await window.api.listClaudeProjects()
    setClaudeProjects(list)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const addDir = async () => {
    const dir = await window.api.pickDir()
    if (dir) {
      const name = dir.split(/[\\/]/).pop()
      await window.api.addRecentProject(dir, name)
      await onConfigChanged()
    }
  }

  const removeRecent = async (path) => {
    await window.api.removeRecentProject(path)
    await onConfigChanged()
  }

  const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : '—')

  return (
    <div className="page">
      <header className="page-head">
        <h2>项目</h2>
        <p className="page-sub">管理工作目录与历史会话。</p>
        <button className="btn primary" onClick={addDir}>
          + 添加目录
        </button>
      </header>

      <div className="card">
        <div className="card-title">最近项目</div>
        {recents.length === 0 ? (
          <div className="hint">还没有最近项目，点「添加目录」选择一个工作目录。</div>
        ) : (
          <div className="recent-list">
            {recents.map((r) => (
              <div key={r.path} className="recent-item">
                <div className="recent-info">
                  <div className="recent-name">{r.name}</div>
                  <div className="recent-path">{r.path}</div>
                </div>
                <div className="provider-ops">
                  <button className="btn ghost sm" onClick={() => runInTerminal(r.path)}>
                    启动
                  </button>
                  <button className="btn ghost sm" onClick={() => window.api.openPath(r.path)}>
                    打开
                  </button>
                  <button className="btn ghost sm danger" onClick={() => removeRecent(r.path)}>
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Claude Code 历史会话</div>
        {claudeProjects.length === 0 ? (
          <div className="hint">未发现 ~/.claude/projects 下的会话存档。</div>
        ) : (
          <div className="recent-list">
            {claudeProjects.map((p) => (
              <div key={p.encodedName} className="recent-item">
                <div className="recent-info">
                  <div className="recent-name">{p.displayPath}</div>
                  <div className="recent-path">
                    {p.sessionCount} 个会话 · 最近 {fmtTime(p.lastModified)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
