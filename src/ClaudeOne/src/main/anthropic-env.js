// 计算注入给 Claude Code 的 Anthropic 环境变量。
//
// Claude Code 内部会按 haiku / sonnet / opus 三档分别请求模型（后台轻量任务用 haiku，
// 主对话用 sonnet/opus，子代理用 subagent）。对接第三方端点时必须把这三档都映射到
// 厂商的真实模型，否则后台/子代理任务会因找不到 claude 官方模型名而失败。
//
// 约定：
//   主模型 model        → ANTHROPIC_MODEL / SONNET / OPUS / SUBAGENT
//   快速模型 haikuModel  → ANTHROPIC_DEFAULT_HAIKU_MODEL（留空则回退到主模型）
//   model 留空时不注入任何模型变量，使用端点默认模型。
export function anthropicEnvVars(provider) {
  const vars = {}
  if (!provider) return vars
  if (provider.baseUrl) vars.ANTHROPIC_BASE_URL = provider.baseUrl
  if (provider.apiKey) vars.ANTHROPIC_AUTH_TOKEN = provider.apiKey

  const model = provider.model && String(provider.model).trim()
  if (model) {
    vars.ANTHROPIC_MODEL = model
    vars.ANTHROPIC_DEFAULT_SONNET_MODEL = model
    vars.ANTHROPIC_DEFAULT_OPUS_MODEL = model
    vars.CLAUDE_CODE_SUBAGENT_MODEL = model
    const haiku = (provider.haikuModel && String(provider.haikuModel).trim()) || model
    vars.ANTHROPIC_DEFAULT_HAIKU_MODEL = haiku
  }
  return vars
}
