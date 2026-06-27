import React, { useState } from 'react'

// ③ 工作目录页（免费版第二页）：
//   - 右上角 ⚙️ 模型按钮：显示当前模型名，点击回到配置模型页修改 / 切换。
//   - 工作目录列表（选过的目录持久展示）：一键在该目录下静默弹独立 PowerShell 窗口启动 claude。
//   - 每个目录可勾选“跳过权限确认”，启动时追加 --dangerously-skip-permissions。
export default function WorkingDir({ config, activeProvider, onConfigChanged, goToProvider }) {
  const dirs = config?.recentProjects || []
  const modelName = activeProvider?.name || '未配置'
  // 按目录记录是否跳过权限确认
  const [skipMap, setSkipMap] = useState({})
  const toggleSkip = (path) => setSkipMap((m) => ({ ...m, [path]: !m[path] }))

  const addDir = async () => {
    const dir = await window.api.pickDir()
    if (dir) {
      const name = dir.split(/[\\/]/).pop()
      await window.api.addRecentProject(dir, name)
      await onConfigChanged()
    }
  }

  const removeDir = async (path) => {
    await window.api.removeRecentProject(path)
    await onConfigChanged()
  }

  // 一键启动：注入当前激活 provider 的环境变量，弹独立 PowerShell 窗口在该目录运行 claude。
  const launch = (path) => {
    window.api.launchClaude({ ...activeProvider, cwd: path, skipPermissions: !!skipMap[path] })
  }

  return (
    <div className="single-page">
      <div className="page">
        <header className="page-head">
          <div>
            <h2>工作目录</h2>
            <p className="page-sub">选择工作目录，一键在该目录下启动 Claude Code。</p>
          </div>
          <button className="btn ghost model-btn" onClick={goToProvider} title="配置 / 切换模型">
            ⚙️ <span className="model-btn-name">{modelName}</span>
          </button>
        </header>

        <div className="card">
          <div className="card-title card-title-row">
            <span>工作目录</span>
            <button className="btn ghost sm" onClick={addDir}>
              + 添加目录
            </button>
          </div>

          {dirs.length === 0 ? (
            <div className="hint">
              还没有添加工作目录。点「+ 添加目录」选择一个文件夹，即可在其中启动 Claude Code。
            </div>
          ) : (
            <div className="recent-list">
              {dirs.map((d) => (
                <div key={d.path} className="recent-item">
                  <div className="recent-info">
                    <div className="recent-name">📁 {d.name}</div>
                    <div className="recent-path">{d.path}</div>
                  </div>
                  <div className="provider-ops">
                    <label
                      className="skip-perm-toggle"
                      title="启动时追加 --dangerously-skip-permissions：跳过所有权限确认（仅在信任的项目中使用）"
                    >
                      <input
                        type="checkbox"
                        checked={!!skipMap[d.path]}
                        onChange={() => toggleSkip(d.path)}
                      />
                      跳过权限确认
                    </label>
                    <button
                      className="btn primary sm"
                      disabled={!activeProvider}
                      onClick={() => launch(d.path)}
                      title="在该目录启动 Claude"
                    >
                      启动 Claude
                    </button>
                    <button className="btn ghost sm" onClick={() => window.api.openPath(d.path)}>
                      打开
                    </button>
                    <button className="btn ghost sm danger" onClick={() => removeDir(d.path)}>
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
