import React, { useState } from 'react'

export default function LaunchStep({ config, onPrev }) {
  const [launched, setLaunched] = useState(false)

  const launch = async () => {
    await window.api.launchClaude({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model
    })
    setLaunched(true)
  }

  return (
    <div className="step">
      <h2>一键启动</h2>
      <p className="step-desc">确认配置无误后，点击启动。将打开一个新终端窗口运行 Claude Code。</p>

      <div className="summary">
        <div className="summary-row">
          <span>BASE URL</span>
          <code>{config.baseUrl}</code>
        </div>
        <div className="summary-row">
          <span>模型</span>
          <code>{config.model}</code>
        </div>
        <div className="summary-row">
          <span>API Key</span>
          <code>{config.apiKey ? '••••••' + config.apiKey.slice(-4) : '未填写'}</code>
        </div>
      </div>

      <button className="btn primary big" onClick={launch}>
        🚀 启动 Claude Code
      </button>

      {launched && (
        <div className="hint ok">
          已在新终端窗口启动。若窗口未出现，请确认 Claude Code 已正确安装。
        </div>
      )}

      <div className="actions">
        <button className="btn ghost" onClick={onPrev}>
          上一步
        </button>
      </div>
    </div>
  )
}
