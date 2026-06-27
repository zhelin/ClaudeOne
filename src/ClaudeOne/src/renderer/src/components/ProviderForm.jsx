import React, { useEffect, useState } from 'react'

// 模型下拉选择器：从厂商可选列表里选，或选「自定义…」手填列表外的模型名。
// options 为空（自定义厂商）时直接退化为文本输入框。
function ModelPicker({ label, hint, value, options, onChange }) {
  const inList = options.includes(value)
  const [custom, setCustom] = useState(!inList && value !== '')
  const showCustom = custom || (!inList && value !== '')

  if (!options.length) {
    return (
      <label>
        {label} {hint && <span className="optional">{hint}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="输入模型名称" />
      </label>
    )
  }

  return (
    <label>
      {label} {hint && <span className="optional">{hint}</span>}
      <select
        value={showCustom ? '__custom__' : value}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            setCustom(true)
          } else {
            setCustom(false)
            onChange(e.target.value)
          }
        }}
      >
        <option value="">（使用端点默认模型）</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value="__custom__">自定义…</option>
      </select>
      {showCustom && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="输入模型名称" />
      )}
    </label>
  )
}

// 可复用的 Provider 配置表单：预设卡片 + BASE_URL/模型/Key 输入 + 连通性测试。
// props:
//   initial: 已有 provider 对象（编辑时传入），无则视为新增
//   onSave(provider): 保存回调
//   onCancel(): 可选取消回调
//   compact: 紧凑模式（门控页用）
export default function ProviderForm({ initial, onSave, onCancel, compact }) {
  const [presets, setPresets] = useState([])
  const [presetId, setPresetId] = useState(initial?.presetId || 'deepseek')
  const [name, setName] = useState(initial?.name || '')
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl || '')
  const [apiKey, setApiKey] = useState(initial?.apiKey || '')
  const [model, setModel] = useState(initial?.model || '')
  const [haikuModel, setHaikuModel] = useState(initial?.haikuModel || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    window.api.listPresets().then((list) => {
      setPresets(list)
      const cur = list.find((p) => p.id === presetId)
      if (cur && cur.id !== 'custom' && !initial) {
        if (!baseUrl) setBaseUrl(cur.baseUrl)
        if (!model) setModel(cur.defaultModel)
        if (!haikuModel) setHaikuModel(cur.haikuModel)
        if (!name) setName(cur.name)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectPreset = (p) => {
    setPresetId(p.id)
    setTestResult(null)
    if (p.id !== 'custom') {
      setBaseUrl(p.baseUrl)
      setModel(p.defaultModel)
      setHaikuModel(p.haikuModel)
      setName(p.name)
    } else {
      setBaseUrl('')
      setModel('')
      setHaikuModel('')
      setName('')
    }
  }

  const current = presets.find((p) => p.id === presetId)
  const isCustom = presetId === 'custom'
  const modelOptions = current?.models || []
  // 模型名称可选：预设自带默认模型；留空则不注入 ANTHROPIC_MODEL，用端点默认模型
  const canSave = baseUrl.trim() && apiKey.trim()

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const r = await window.api.testProvider({ baseUrl, apiKey, model })
    setTestResult(r)
    setTesting(false)
  }

  const handleSave = () => {
    onSave({
      id: initial?.id,
      presetId,
      name: name.trim() || current?.name || 'Provider',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      haikuModel: haikuModel.trim(),
      type: 'anthropic'
    })
  }

  return (
    <div className="provider-form">
      <div className="preset-grid">
        {presets.map((p) => (
          <div
            key={p.id}
            className={`preset ${presetId === p.id ? 'active' : ''}`}
            onClick={() => selectPreset(p)}
          >
            {presetId === p.id && <span className="preset-check">✓</span>}
            <div className="preset-en">{p.en || p.name}</div>
            {p.cn && <div className="preset-cn">{p.cn}</div>}
          </div>
        ))}
      </div>

      <div className="form">
        {!compact && (
          <label>
            备注名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给这个配置起个名，便于切换识别"
            />
          </label>
        )}
        <label>
          BASE URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/anthropic"
            readOnly={!isCustom}
          />
        </label>
        <ModelPicker
          key={`model-${presetId}`}
          label="模型名称"
          hint="（主模型，留空用端点默认）"
          value={model}
          options={modelOptions}
          onChange={setModel}
        />
        <ModelPicker
          key={`haiku-${presetId}`}
          label="快速模型"
          hint="（轻量/后台任务用，可留空则跟随主模型）"
          value={haikuModel}
          options={modelOptions}
          onChange={setHaikuModel}
        />
        <label>
          API Key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </label>
        {current?.apiKeyUrl && (
          <a className="doc-link" onClick={() => window.api.openExternal(current.apiKeyUrl)}>
            前往 {current.name} 获取 API Key →
          </a>
        )}
      </div>

      {testResult && (
        <div className={`hint ${testResult.ok ? 'ok' : 'warn'}`}>{testResult.message}</div>
      )}

      <div className="actions">
        {onCancel ? (
          <button className="btn ghost" onClick={onCancel}>
            取消
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" disabled={!canSave || testing} onClick={handleTest}>
            {testing ? '测试中…' : '测试连通性'}
          </button>
          <button className="btn primary" disabled={!canSave} onClick={handleSave}>
            保存模型配置
          </button>
        </div>
      </div>
    </div>
  )
}
