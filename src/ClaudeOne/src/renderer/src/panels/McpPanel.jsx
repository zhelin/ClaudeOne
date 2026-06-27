import React, { useEffect, useState, useCallback } from 'react'

const EMPTY = { name: '', type: 'stdio', command: '', args: '', url: '' }

// 🔌 MCP 管理：直接读写 ~/.claude.json 的 mcpServers，与 Claude Code 共用。
export default function McpPanel() {
  const [servers, setServers] = useState([])
  const [editing, setEditing] = useState(null) // null | { ...form }

  const reload = useCallback(async () => {
    const list = await window.api.listMcp()
    setServers(list)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const startNew = () => setEditing({ ...EMPTY })
  const startEdit = (s) =>
    setEditing({
      name: s.name,
      type: s.type,
      command: s.command,
      args: (s.args || []).join(' '),
      url: s.url
    })

  const save = async () => {
    const form = editing
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      type: form.type,
      command: form.command.trim(),
      args: form.args.trim() ? form.args.trim().split(/\s+/) : [],
      url: form.url.trim()
    }
    await window.api.upsertMcp(payload)
    setEditing(null)
    await reload()
  }

  const remove = async (name) => {
    await window.api.deleteMcp(name)
    await reload()
  }

  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }))

  return (
    <div className="page">
      <header className="page-head">
        <h2>MCP 服务器</h2>
        <p className="page-sub">管理 Model Context Protocol 服务器，与 Claude Code 配置共用。</p>
        {!editing && (
          <button className="btn primary" onClick={startNew}>
            + 新增
          </button>
        )}
      </header>

      {editing ? (
        <div className="card">
          <div className="form">
            <label>
              名称
              <input value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="如 filesystem" />
            </label>
            <label>
              类型
              <select
                className="text-input"
                value={editing.type}
                onChange={(e) => set('type', e.target.value)}
              >
                <option value="stdio">stdio（本地命令）</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
            </label>
            {editing.type === 'stdio' ? (
              <>
                <label>
                  命令
                  <input value={editing.command} onChange={(e) => set('command', e.target.value)} placeholder="如 npx" />
                </label>
                <label>
                  参数（空格分隔）
                  <input value={editing.args} onChange={(e) => set('args', e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem /path" />
                </label>
              </>
            ) : (
              <label>
                URL
                <input value={editing.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
              </label>
            )}
          </div>
          <div className="actions">
            <button className="btn ghost" onClick={() => setEditing(null)}>
              取消
            </button>
            <button className="btn primary" onClick={save}>
              保存
            </button>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <div className="hint">还没有 MCP 服务器，点「新增」添加一个。</div>
      ) : (
        <div className="provider-list">
          {servers.map((s) => (
            <div key={s.name} className="card provider-card">
              <div className="provider-main">
                <div className="provider-title">
                  <span className="badge">{s.type}</span>
                  <strong>{s.name}</strong>
                </div>
                <div className="provider-meta">
                  <code>{s.type === 'stdio' ? `${s.command} ${(s.args || []).join(' ')}` : s.url}</code>
                </div>
              </div>
              <div className="provider-ops">
                <button className="btn ghost sm" onClick={() => startEdit(s)}>
                  编辑
                </button>
                <button className="btn ghost sm danger" onClick={() => remove(s.name)}>
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
