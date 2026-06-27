import React, { useEffect, useState } from 'react'

export default function ModelStep({ config, setConfig, onNext, onPrev }) {
  const [presets, setPresets] = useState([])
  const [presetId, setPresetId] = useState(config.presetId || 'deepseek')
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '')
  const [apiKey, setApiKey] = useState(config.apiKey || '')
  const [model, setModel] = useState(config.model || '')

  useEffect(() => {
    window.api.listPresets().then((list) => {
      setPresets(list)
      const cur = list.find((p) => p.id === presetId)
      if (cur && cur.id !== 'custom') {
        if (!baseUrl) setBaseUrl(cur.baseUrl)
        if (!model) setModel(cur.defaultModel)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectPreset = (p) => {
    setPresetId(p.id)
    if (p.id !== 'custom') {
      setBaseUrl(p.baseUrl)
      setModel(p.defaultModel)
    } else {
      setBaseUrl('')
      setModel('')
    }
  }

  const current = presets.find((p) => p.id === presetId)
  const isCustom = presetId === 'custom'
  const canNext = baseUrl.trim() && apiKey.trim() && model.trim()

  const handleNext = async () => {
    const saved = await window.api.saveConfig({ presetId, baseUrl, apiKey, model })
    setConfig(saved)
    onNext()
  }

  return (
    <div className="step">
      <h2>选择模型</h2>
      <p className="step-desc">
        选择一个国产大模型预设，填入你的 API Key。Key 仅保存在本地，不会上传。
      </p>

      <div className="preset-grid">
        {presets.map((p) => (
          <div
            key={p.id}
            className={`preset ${presetId === p.id ? 'active' : ''}`}
            onClick={() => selectPreset(p)}
          >
            <div className="preset-name">{p.name}</div>
            <div className={`preset-tag ${p.type}`}>
              {p.type === 'anthropic' ? '原生兼容' : '需转换代理'}
            </div>
          </div>
        ))}
      </div>

      {current?.note && <div className="hint">{current.note}</div>}
      {current?.type === 'openai' && (
        <div className="hint warn">
          该模型为 OpenAI 格式，转换代理将在后续版本接入；当前建议先选“原生兼容”的模型。
        </div>
      )}

      <div className="form">
        <label>
          BASE URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/anthropic"
            readOnly={!isCustom}
          />
        </label>
        <label>
          模型名称
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="如 deepseek-chat"
            readOnly={!isCustom}
          />
        </label>
        <label>
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </label>
        {current?.docUrl && (
          <a className="doc-link" onClick={() => window.api.openExternal(current.docUrl)}>
            前往 {current.name} 获取 API Key →
          </a>
        )}
      </div>

      <div className="actions">
        <button className="btn ghost" onClick={onPrev}>
          上一步
        </button>
        <button className="btn primary" disabled={!canNext} onClick={handleNext}>
          下一步
        </button>
      </div>
    </div>
  )
}
