import React, { useEffect, useState, useCallback } from 'react'

// ✨ Skills 应用市场：本地已安装 Skills + 精选市场推荐位。
export default function SkillsPanel() {
  const [installed, setInstalled] = useState([])
  const [market, setMarket] = useState([])

  const reload = useCallback(async () => {
    const [inst, mk] = await Promise.all([
      window.api.listInstalledSkills(),
      window.api.marketplaceSkills()
    ])
    setInstalled(inst)
    setMarket(mk)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div className="page">
      <header className="page-head">
        <h2>Skills 应用市场</h2>
        <p className="page-sub">浏览已安装的 Skills，或从市场获取更多能力扩展。</p>
        <button className="btn ghost" onClick={reload}>
          刷新
        </button>
      </header>

      <div className="card">
        <div className="card-title">已安装（~/.claude/skills）</div>
        {installed.length === 0 ? (
          <div className="hint">还没有安装任何 Skill。可从下方市场获取。</div>
        ) : (
          <div className="recent-list">
            {installed.map((s) => (
              <div key={s.name} className="recent-item">
                <div className="recent-info">
                  <div className="recent-name">{s.name}</div>
                  <div className="recent-path">{s.description || '（无描述）'}</div>
                </div>
                <button className="btn ghost sm" onClick={() => window.api.openPath(s.path)}>
                  打开
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">精选市场</div>
        <div className="market-grid">
          {market.map((m) => (
            <div key={m.id} className="market-card">
              <div className="market-name">{m.name}</div>
              <div className="market-desc">{m.description}</div>
              <button className="btn primary sm" onClick={() => window.api.openExternal(m.url)}>
                前往获取 →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
