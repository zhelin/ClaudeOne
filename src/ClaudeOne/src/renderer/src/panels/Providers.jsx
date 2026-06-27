import React, { useEffect, useState, useCallback } from 'react'
import ProviderForm from '../components/ProviderForm'

// 🧩 Provider 管理：多 provider 列表，激活切换、新增、编辑、删除。
export default function Providers({ onConfigChanged }) {
  const [providers, setProviders] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | providerObject

  const reload = useCallback(async () => {
    const cfg = await window.api.loadConfig()
    setProviders(cfg.providers || [])
    setActiveId(cfg.activeProviderId || null)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const activate = async (id) => {
    await window.api.setActiveProvider(id)
    await reload()
    await onConfigChanged()
  }

  const remove = async (id) => {
    await window.api.deleteProvider(id)
    await reload()
    await onConfigChanged()
  }

  const save = async (provider) => {
    await window.api.upsertProvider(provider)
    setEditing(null)
    await reload()
    await onConfigChanged()
  }

  if (editing) {
    return (
      <div className="page">
        <header className="page-head">
          <h2>{editing === 'new' ? '新增 Provider' : '编辑 Provider'}</h2>
        </header>
        <div className="card">
          <ProviderForm
            initial={editing === 'new' ? null : editing}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <h2>模型 Provider</h2>
        <p className="page-sub">管理多个大模型配置，一键切换当前使用的模型。</p>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + 新增
        </button>
      </header>

      {providers.length === 0 ? (
        <div className="hint">还没有任何 Provider，点「新增」添加一个。</div>
      ) : (
        <div className="provider-list">
          {providers.map((p) => (
            <div key={p.id} className={`card provider-card ${p.id === activeId ? 'active' : ''}`}>
              <div className="provider-main">
                <div className="provider-title">
                  {p.id === activeId && <span className="badge ok">使用中</span>}
                  <strong>{p.name}</strong>
                </div>
                <div className="provider-meta">
                  <code>{p.baseUrl}</code>
                  <span className="dim"> · {p.model}</span>
                </div>
              </div>
              <div className="provider-ops">
                {p.id !== activeId && (
                  <button className="btn ghost sm" onClick={() => activate(p.id)}>
                    设为当前
                  </button>
                )}
                <button className="btn ghost sm" onClick={() => setEditing(p)}>
                  编辑
                </button>
                <button className="btn ghost sm danger" onClick={() => remove(p.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
