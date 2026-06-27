import React from 'react'
import ProviderForm from './ProviderForm'

// ② 配置模型页：保存时自动校验，通过后才放行到工作目录页。
//   - initial：已激活的 provider（从齿轮进入时用于编辑 / 切换当前模型）
//   - onBack：已配置过时显示「返回工作目录」入口；首次配置时为空
export default function ProviderGate({ initial, onDone, onBack }) {
  const handleSave = async (provider) => {
    await window.api.upsertProvider(provider)
    onDone()
  }

  return (
    <div className="single-page">
      <div className="page">
        <header className="page-head">
          <div>
            <h2>配置模型</h2>
            <p className="page-sub">
              选择一个国产大模型，填入 API Key（仅保存在本地，不会上传）。保存校验通过后进入工作目录。
            </p>
          </div>
          {onBack && (
            <button className="icon-btn" onClick={onBack} title="返回工作目录">
              ←
            </button>
          )}
        </header>
        <ProviderForm initial={initial} onSave={handleSave} compact />
      </div>
    </div>
  )
}
