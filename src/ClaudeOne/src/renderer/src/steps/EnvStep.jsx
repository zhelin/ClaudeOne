import React, { useEffect, useState, useRef } from 'react'

function Row({ name, info }) {
  const ok = info?.installed
  return (
    <div className="check-row">
      <span className={`dot ${ok ? 'ok' : 'bad'}`} />
      <span className="check-name">{name}</span>
      <span className="check-val">{ok ? info.version : '未安装'}</span>
    </div>
  )
}

export default function EnvStep({ env, setEnv, onNext }) {
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [log, setLog] = useState('')
  const logRef = useRef(null)

  const detect = async () => {
    setLoading(true)
    const result = await window.api.detectEnv()
    setEnv(result)
    setLoading(false)
  }

  useEffect(() => {
    if (!env) detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const off = window.api.onInstallLog((chunk) => {
      setLog((prev) => prev + chunk)
      requestAnimationFrame(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
      })
    })
    return off
  }, [])

  const install = async () => {
    setInstalling(true)
    setLog('开始安装 @anthropic-ai/claude-code …\n')
    const res = await window.api.installClaude()
    setLog((p) => p + (res.success ? '\n✓ 安装完成\n' : `\n✗ 安装失败 (code ${res.code})\n`))
    await detect()
    setInstalling(false)
  }

  const installNode = async () => {
    setInstalling(true)
    setLog('准备安装 Node.js …\n')
    const res = await window.api.installNode()
    if (!res.success && res.reason === 'installer-missing') {
      setLog(
        (p) =>
          p +
          '\n未找到随包的 Node 安装文件，请改用下方链接到官网下载安装。\n'
      )
    }
    await detect()
    setInstalling(false)
  }

  const installGit = async () => {
    setInstalling(true)
    setLog('准备安装 Git …\n')
    const res = await window.api.installGit()
    if (!res.success && res.reason === 'installer-missing') {
      setLog(
        (p) =>
          p +
          '\n未找到随包的 Git 安装文件，请改用下方链接到官网下载安装。\n'
      )
    }
    await detect()
    setInstalling(false)
  }

  const nodeOk = env?.node?.installed
  const gitOk = env?.git?.installed
  const claudeOk = env?.claude?.installed
  const hasBundledNode = env?.bundledNode
  const hasBundledGit = env?.bundledGit

  return (
    <div className="step">
      <h2>环境检测</h2>
      <p className="step-desc">Claude Code 依赖 Node.js 运行环境。下面检测你的系统状态。</p>

      <div className="check-box">
        {env ? (
          <>
            <Row name="Node.js" info={env.node} />
            <Row name="npm" info={env.npm} />
            <Row name="Git" info={env.git} />
            <Row name="Claude Code" info={env.claude} />
          </>
        ) : (
          <p className="muted">检测中…</p>
        )}
      </div>

      {!nodeOk && env && hasBundledNode && (
        <button className="btn primary" disabled={installing} onClick={installNode}>
          {installing ? '安装中…' : '一键安装 Node.js'}
        </button>
      )}

      {!nodeOk && env && !hasBundledNode && (
        <div className="hint warn">
          未检测到 Node.js，请先安装{' '}
          <a onClick={() => window.api.openExternal('https://nodejs.org/zh-cn/download')}>
            Node.js
          </a>
          ，再回来点击“重新检测”。
        </div>
      )}

      {!gitOk && env && hasBundledGit && (
        <button className="btn primary" disabled={installing} onClick={installGit}>
          {installing ? '安装中…' : '一键安装 Git'}
        </button>
      )}

      {!gitOk && env && !hasBundledGit && (
        <div className="hint warn">
          未检测到 Git（Claude Code 部分功能依赖），请先安装{' '}
          <a onClick={() => window.api.openExternal('https://git-scm.com/download/win')}>
            Git
          </a>
          ，再回来点击“重新检测”。
        </div>
      )}

      {nodeOk && !claudeOk && (
        <button className="btn primary" disabled={installing} onClick={install}>
          {installing ? '安装中…' : '一键安装 Claude Code'}
        </button>
      )}

      {(installing || log) && (
        <pre className="log" ref={logRef}>
          {log}
        </pre>
      )}

      <div className="actions">
        <button className="btn ghost" disabled={loading || installing} onClick={detect}>
          {loading ? '检测中…' : '重新检测'}
        </button>
        <button className="btn primary" disabled={!nodeOk || !claudeOk} onClick={onNext}>
          下一步
        </button>
      </div>
    </div>
  )
}
