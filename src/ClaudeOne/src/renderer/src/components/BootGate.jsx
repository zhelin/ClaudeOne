import React, { useEffect, useRef, useState } from 'react'

// ① 启动门控：静默自检 + 自动安装缺失环境，无独立按钮。
// 自动运行 autoSetup，流式显示进度；就绪后自动进入下一步，失败可重试。
export default function BootGate({ onDone }) {
  const [log, setLog] = useState('')
  const [status, setStatus] = useState('running') // running | ready | failed
  const logRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const off = window.api.onInstallLog((chunk) => {
      setLog((prev) => prev + chunk)
      requestAnimationFrame(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
      })
    })
    return off
  }, [])

  const run = async () => {
    setStatus('running')
    setLog('')
    const res = await window.api.autoSetup()
    if (res.ready) {
      setStatus('ready')
      // 稍作停留让用户看到「就绪」，再进入下一步
      setTimeout(() => onDone(), 700)
    } else {
      setStatus('failed')
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 单行状态：就绪/失败用固定文案，运行中取日志最后一行非空内容（对齐 demo 的单行提示）
  const lastLine = log.split('\n').map((l) => l.trim()).filter(Boolean).pop() || ''
  const bootMsg =
    status === 'ready'
      ? '环境准备完成，正在进入…'
      : status === 'failed'
        ? '环境未就绪，请重试'
        : lastLine.replace(/^✓\s*/, '') || '正在检测运行环境…'

  return (
    <div className="boot">
      {status === 'failed' ? (
        <div className="boot-fail">⚠</div>
      ) : (
        <div className="spinner lg" />
      )}
      <div className="boot-msg">{bootMsg}</div>
      <div className="boot-sub">首次使用会自动安装所需组件，无需任何操作，请稍候…</div>

      {status === 'failed' && (
        <>
          <pre className="log boot-log" ref={logRef}>
            {log || '初始化…'}
          </pre>
          <div className="boot-actions">
            <button className="btn primary" onClick={run}>
              重试
            </button>
            <button className="btn ghost" onClick={() => onDone()}>
              跳过
            </button>
          </div>
        </>
      )}
    </div>
  )
}
