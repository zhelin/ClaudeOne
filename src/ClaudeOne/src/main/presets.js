// 国产兼容大模型预设（6 家国内主流厂商）
//
// 数据参考 GitHub cc-switch（farion1231/cc-switch）的 claudeProviderPresets.ts，
// 全部选用「原生 Anthropic 兼容端点」（路线 A）：直接把 ANTHROPIC_BASE_URL 指过去即可，
// 零格式转换、无需本地代理，对小白最省心。
//
// 字段说明：
//   id           唯一标识
//   name         显示名
//   type         'anthropic' = 原生 Anthropic 兼容端点（路线 A，本文件全部如此）
//   baseUrl      注入到 ANTHROPIC_BASE_URL
//   models       该厂商当前可选模型列表（用于下拉选择，排在前面的更强/更新）
//   defaultModel 默认主模型（→ ANTHROPIC_MODEL / SONNET / OPUS / SUBAGENT）
//   haikuModel   默认快速模型（→ ANTHROPIC_DEFAULT_HAIKU_MODEL，后台轻量任务用）
//   docUrl       厂商主页 / 接入文档
//   apiKeyUrl    申请 API Key 的直达页面（用于「去申请 Key」按钮）
//   note         给用户的一句话说明
//
// 模型名以 2026-06 各家官方控制台为准；端点地址与模型名会随官方调整，
// 首次接入务必用真实 Key 实测一次，列表外的模型可在下拉中选「自定义…」手填。
export const MODEL_PRESETS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    en: 'DeepSeek',
    cn: '深度求索',
    type: 'anthropic',
    baseUrl: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-v4-pro',
    haikuModel: 'deepseek-v4-flash',
    docUrl: 'https://platform.deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    note: '官方原生 Anthropic 兼容端点，性价比高，推荐首选（deepseek-chat/reasoner 将于 2026-07 下线）'
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    en: 'GLM',
    cn: '智谱',
    type: 'anthropic',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    models: ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4.5-air'],
    defaultModel: 'glm-5.2',
    haikuModel: 'glm-4.5-air',
    docUrl: 'https://open.bigmodel.cn',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
    note: '官方原生 Anthropic 兼容端点，GLM Coding Plan 适合编程'
  },
  {
    id: 'kimi',
    name: 'Kimi 月之暗面',
    en: 'Kimi',
    cn: '月之暗面',
    type: 'anthropic',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    models: ['kimi-k2.7-code', 'kimi-k2.7-code-highspeed', 'kimi-k2.6', 'kimi-k2.5'],
    defaultModel: 'kimi-k2.7-code',
    haikuModel: 'kimi-k2.7-code-highspeed',
    docUrl: 'https://platform.kimi.com',
    apiKeyUrl: 'https://platform.kimi.com/console/api-keys',
    note: 'K2 系列原生 Anthropic 兼容端点，Coding 与长上下文强'
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen（阿里百炼）',
    en: 'Qwen',
    cn: '通义千问',
    type: 'anthropic',
    baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    models: ['qwen3.7-plus', 'qwen3.7-max', 'qwen3.6-plus', 'qwen3.6-flash', 'qwen3-coder-plus'],
    defaultModel: 'qwen3.7-plus',
    haikuModel: 'qwen3.6-flash',
    docUrl: 'https://bailian.console.aliyun.com',
    apiKeyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key',
    note: '百炼平台原生 Anthropic 兼容端点；模型名以百炼控制台开通为准'
  },
  {
    id: 'doubao',
    name: '豆包 Doubao（火山方舟）',
    en: 'Doubao',
    cn: '豆包',
    type: 'anthropic',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/compatible',
    models: ['doubao-seed-code', 'doubao-seed-1.6', 'doubao-seed-1.6-flash'],
    defaultModel: 'doubao-seed-code',
    haikuModel: 'doubao-seed-1.6-flash',
    docUrl: 'https://www.volcengine.com/product/ark',
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    note: '火山方舟 Anthropic 兼容端点；模型名（含推理接入点）以方舟控制台为准'
  },
  {
    id: 'minimax',
    name: 'MiniMax 海螺',
    en: 'MiniMax',
    cn: '海螺',
    type: 'anthropic',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    models: ['MiniMax-M2.7', 'MiniMax-M3', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.1'],
    defaultModel: 'MiniMax-M2.7',
    haikuModel: 'MiniMax-M2.7-highspeed',
    docUrl: 'https://platform.minimaxi.com',
    apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    note: '官方原生 Anthropic 兼容端点，M 系列擅长编码与 Agent'
  },
  {
    id: 'custom',
    name: '自定义',
    en: '自定义',
    cn: '',
    type: 'anthropic',
    baseUrl: '',
    models: [],
    defaultModel: '',
    haikuModel: '',
    docUrl: '',
    apiKeyUrl: '',
    note: '填写你自己的 BASE_URL 与模型名（含自建网关 / 中转站）'
  }
]
