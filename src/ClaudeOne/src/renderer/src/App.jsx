import React, { useEffect, useState, useCallback } from 'react'
import BootGate from './components/BootGate'
import ProviderGate from './components/ProviderGate'
import WorkingDir from './components/WorkingDir'

// 免费版三段式：①静默自检&自动安装 → ②配置模型页（保存校验通过才放行）→ ③工作目录页
// phase: 'boot' | 'provider' | 'projects'
export default function App() {
  const [phase, setPhase] = useState('boot')
  const [config, setConfig] = useState(null)
  const [activeProvider, setActiveProvider] = useState(null)

  const refreshConfig = useCallback(async () => {
    const cfg = await window.api.loadConfig()
    const ap = await window.api.getActiveProvider()
    setConfig(cfg)
    setActiveProvider(ap)
    return cfg
  }, [])

  useEffect(() => {
    refreshConfig()
  }, [refreshConfig])

  // 环境就绪后：已配置过模型 → 直接进工作目录页；否则 → 配置模型页
  const handleBootDone = useCallback(async () => {
    const cfg = await refreshConfig()
    const hasActive = cfg?.providers?.some((p) => p.id === cfg.activeProviderId)
    setPhase(hasActive ? 'projects' : 'provider')
  }, [refreshConfig])

  // 保存模型配置校验通过后 → 工作目录页
  const handleProviderDone = useCallback(async () => {
    await refreshConfig()
    setPhase('projects')
  }, [refreshConfig])

  if (phase === 'boot') {
    return <BootGate onDone={handleBootDone} />
  }
  if (phase === 'provider') {
    return (
      <ProviderGate
        initial={activeProvider}
        onDone={handleProviderDone}
        onBack={activeProvider ? () => setPhase('projects') : null}
      />
    )
  }
  return (
    <WorkingDir
      config={config}
      activeProvider={activeProvider}
      onConfigChanged={refreshConfig}
      goToProvider={() => setPhase('provider')}
    />
  )
}
