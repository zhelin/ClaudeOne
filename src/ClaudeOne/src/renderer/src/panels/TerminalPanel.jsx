import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// 💻 终端：默认内嵌（xterm.js + 主进程 node-pty），可切换为「系统终端」。
// 本面板常驻挂载（由父级用 visible 控制显隐），会话在首次可见时惰性创建并保留。
// autoRunSignal 变化时自动在内嵌终端里启动 claude。
let sessionSeq = 0

export default function TerminalPanel({ activeProvider, config, autoRunSignal, initialCwd, visible }) {
  const [mode, setMode] = useState(config?.settings?.terminalMode || 'embedded')
  const [cwd, setCwd] = useState(initialCwd || '')
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const sessionIdRef = useRef(null)
  const offDataRef = useRef(null)
  const offExitRef = useRef(null)
  const initedRef = useRef(false)
  const cwdRef = useRef(cwd)
  const providerRef = useRef(activeProvider)
  const lastAutoRunRef = useRef(autoRunSignal)

  useEffect(() => {
    setCwd(initialCwd || '')
    cwdRef.current = initialCwd || ''
  }, [initialCwd])

  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])
  useEffect(() => {
    providerRef.current = activeProvider
  }, [activeProvider])

  const teardown = () => {
    if (offDataRef.current) offDataRef.current()
    if (offExitRef.current) offExitRef.current()
    offDataRef.current = null
    offExitRef.current = null
    if (sessionIdRef.current) {
      window.api.termDestroy(sessionIdRef.current)
      sessionIdRef.current = null
    }
    if (termRef.current) {
      termRef.current.dispose()
      termRef.current = null
    }
    fitRef.current = null
  }

  // 建立内嵌终端会话（先清理旧会话再新建）
  const startEmbedded = (runClaude) => {
    if (!containerRef.current) return
    teardown()

    const term = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: { background: '#0a0c10', foreground: '#d6dae2' }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    try {
      fit.fit()
    } catch {
      // 容器尚不可见时 fit 可能失败，忽略
    }
    termRef.current = term
    fitRef.current = fit

    const id = `sess-${++sessionSeq}`
    sessionIdRef.current = id

    offDataRef.current = window.api.onTermData(({ id: sid, data }) => {
      if (sid === id) term.write(data)
    })
    offExitRef.current = window.api.onTermExit(({ id: sid }) => {
      if (sid === id) term.write('\r\n\x1b[33m[会话已结束]\x1b[0m\r\n')
    })

    term.onData((data) => window.api.termWrite(id, data))

    const p = providerRef.current
    window.api
      .termCreate({
        id,
        cwd: cwdRef.current || undefined,
        provider: p ? { baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.model } : null,
        runClaude
      })
      .then(() => {
        if (termRef.current) {
          window.api.termResize(id, termRef.current.cols, termRef.current.rows)
        }
      })
  }

  // 模式 / 可见性变化：内嵌模式首次可见时惰性建会话；系统模式则拆掉内嵌会话
  useEffect(() => {
    if (mode === 'embedded') {
      if (visible && !initedRef.current) {
        initedRef.current = true
        requestAnimationFrame(() => startEmbedded(false))
      }
    } else {
      teardown()
      initedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, visible])

  // 卸载时清理
  useEffect(() => teardown, [])

  // 变为可见 / 窗口尺寸变化时自适应尺寸
  const refit = () => {
    if (fitRef.current && termRef.current && sessionIdRef.current) {
      try {
        fitRef.current.fit()
        window.api.termResize(sessionIdRef.current, termRef.current.cols, termRef.current.rows)
      } catch {
        // 忽略
      }
    }
  }

  useEffect(() => {
    if (visible) requestAnimationFrame(refit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    window.addEventListener('resize', refit)
    return () => window.removeEventListener('resize', refit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 收到「在内嵌终端启动」信号：切到内嵌模式并新建一个直接进 claude 的会话
  useEffect(() => {
    if (autoRunSignal === lastAutoRunRef.current) return
    lastAutoRunRef.current = autoRunSignal
    if (mode !== 'embedded') setMode('embedded')
    initedRef.current = true
    requestAnimationFrame(() => startEmbedded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunSignal])

  const runClaudeNow = () => {
    if (sessionIdRef.current) {
      const cmd = navigator.platform.startsWith('Win') ? 'claude\r' : 'claude\n'
      window.api.termWrite(sessionIdRef.current, cmd)
    } else {
      initedRef.current = true
      startEmbedded(true)
    }
  }

  const launchSystem = async () => {
    await window.api.launchClaude({ ...activeProvider, cwd })
  }

  return (
    <div className="page term-page">
      <header className="page-head term-head">
        <div>
          <h2>终端</h2>
          <p className="page-sub">
            {activeProvider ? `当前模型：${activeProvider.name}` : '未配置 Provider'}
          </p>
        </div>
        <div className="term-controls">
          <div className="seg">
            <button
              className={`seg-btn ${mode === 'embedded' ? 'active' : ''}`}
              onClick={() => setMode('embedded')}
            >
              内嵌
            </button>
            <button
              className={`seg-btn ${mode === 'system' ? 'active' : ''}`}
              onClick={() => setMode('system')}
            >
              系统终端
            </button>
          </div>
          {mode === 'embedded' && (
            <button className="btn primary sm" onClick={runClaudeNow} disabled={!activeProvider}>
              ▶ 运行 claude
            </button>
          )}
        </div>
      </header>

      {/* 内嵌终端容器常驻，避免重挂导致会话丢失 */}
      <div
        className="term-host"
        ref={containerRef}
        style={{ display: mode === 'embedded' ? 'block' : 'none' }}
      />

      {mode === 'system' && (
        <div className="card">
          <p className="muted">
            将在系统自带终端窗口中启动 Claude Code（注入当前 Provider 环境变量）。
          </p>
          <div className="field-input-row" style={{ marginTop: 12 }}>
            <input
              className="text-input"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="工作目录（留空则用主目录）"
            />
            <button className="btn primary" onClick={launchSystem} disabled={!activeProvider}>
              🪟 用系统终端启动
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
