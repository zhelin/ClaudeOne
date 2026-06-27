# ClaudeOne

> 一键安装 / 一键启动 Claude Code，对接国产兼容大模型的桌面 GUI 工具。

面向**零基础小白**：打开即自动检测并静默安装 Node.js / Git / Claude Code，填一个 API Key、选个文件夹，就能用上 Claude Code —— 全程不用开终端、不用看懂任何命令。

[![Build & Release](https://github.com/zhelin/ClaudeOne/actions/workflows/build.yml/badge.svg)](https://github.com/zhelin/ClaudeOne/actions/workflows/build.yml)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![license](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能特性

- **开机自检，缺啥装啥**：自动检测 Node.js / Git / Claude Code，缺失即静默安装（Node `.msi`、Git `/VERYSILENT`、Claude Code 走国内镜像），自动补 PATH，无需点任何按钮。
- **6 家国产大模型一键预设**：DeepSeek、智谱 GLM、Kimi、通义千问、豆包、MiniMax，均为原生 Anthropic 兼容端点，填 Key 即用；也支持自定义网关 / 中转站。
- **配置保存前自动校验**：API Key 必填、自定义需 BASE URL，校验不过不放行，避免配错跑不起来。
- **一键在指定目录启动**：选好工作目录，自动注入环境变量并弹出独立终端窗口运行 `claude`。
- **配置仅本地保存**：API Key 原子写入本地、自动备份，不上传任何服务器。
- **小白零门槛**：内置 Node / Git 安装包随程序一起打包，开机检测到缺失即自动安装。

## 📦 下载安装

前往 [Releases 页面](../../releases) 下载对应系统的最新版本：

| 系统 | 文件 | 说明 |
|---|---|---|
| Windows | `ClaudeOne-x.x.x-win-x64.exe` | 单文件免安装，双击即用 |
| macOS（Apple 芯片）| `ClaudeOne-x.x.x-mac-arm64.dmg` | M 系列芯片 |
| macOS（Intel）| `ClaudeOne-x.x.x-mac-x64.dmg` | 老款 Intel Mac |

> **macOS 首次打开提示「已损坏 / 无法验证」**：因应用未做 Apple 签名，请在程序图标上**右键 → 打开**，再点「打开」即可（仅首次需要）。

## 🚀 使用流程

```
①开机自检（自动检测 + 静默安装，单行状态）
        ↓ 自动
②配置模型页（选预设 / 自定义 + 填 API Key，保存时自动校验）
        ↓ 校验通过
③工作目录页（选文件夹 → 一键启动 Claude Code）
```

配好后，点右上角 **⚙️ 齿轮**可随时回去切换 / 修改模型。

## 🛠️ 本地开发

环境要求：Node.js 20+。

```bash
cd src/ClaudeOne
npm install
npm run dev        # 启动开发模式
```

## 📦 本地打包

> 国内打包需先设镜像环境变量（CI 上无需）。

**Windows：**

```powershell
cd src\ClaudeOne
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run package
```

**macOS：**

```bash
cd src/ClaudeOne
npm run package:mac
```

产物输出在 `src/ClaudeOne/dist/` 下。

> 随包内置的 Node / Git 安装器（`build/node-installer.msi`、`build/git-installer.exe`）体积大、不入库，
> 本地打 Windows 包前需手动放置，详见 [src/ClaudeOne/build/README.md](src/ClaudeOne/build/README.md)。

## 🤖 自动构建（GitHub Actions）

本仓库已配置 [`.github/workflows/build.yml`](.github/workflows/build.yml)，可自动在云端同时打包 Windows + macOS：

- **发版**：推送 `v` 开头的 tag，自动打包双系统并发布到 Release。
  ```bash
  # 先把 src/ClaudeOne/package.json 的 version 加一位，提交后：
  git tag v0.1.4
  git push origin v0.1.4
  ```
- **试打包**：在仓库 **Actions** 页面手动点 **Run workflow**，产物存为 artifact（不发 Release）。

CI 会在各自系统上重新编译原生模块（`node-pty`），并自动下载 Node / Git 安装器塞进 Windows 包。

## 🧱 技术栈

Electron + React + electron-vite，主 / 预载 / 渲染三进程隔离（contextIsolation + IPC 白名单）。

## 📄 许可证

[MIT](LICENSE)
