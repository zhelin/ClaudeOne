# 放置 Node.js 安装文件（打进安装包）

ClaudeOne 会把官方 Node.js 安装文件一起打进安装包，让小白用户**无需预装 Node、无需开终端**，
在 App 内点「一键安装 Node.js」即可由程序自动静默安装（不使用私有 / 便携版 Node，装到系统标准位置）。

## 操作步骤

1. 到 Node.js 官网下载 **Windows 64 位 `.msi` 安装包**（建议 LTS）：
   - https://nodejs.org/zh-cn/download
   - 例如：`node-v20.19.5-x64.msi`
2. 把下载的文件**重命名为 `node-installer.msi`**，放到本目录（`src/ClaudeOne/build/node-installer.msi`）。
3. 正常打包：
   ```powershell
   npm run package
   ```
   electron-builder 会通过 `extraResources` 把它拷到安装后的 `resources/node-installer.msi`。

## 运行时行为

- 程序通过 `resolveNodeInstaller()` 找到该文件（生产环境在 `process.resourcesPath` 下）。
- 点「一键安装 Node.js」后，以管理员身份（会弹一次 UAC 授权）运行：
  ```
  msiexec /i "<node-installer.msi>" /passive /norestart
  ```
  `/passive` 只显示进度条、**不需要用户点任何"下一步"**，实现"自动点击安装"。
- 装完自动把 `C:\Program Files\nodejs` 补进当前进程 PATH，无需重启 App 即可继续装 Claude Code。

## 说明

- 本目录的 `.msi` **不纳入版本库**（体积大）。请在本地 / CI 打包前放置。
- 若未放置该文件，App 会自动退回「去官网下载」提示，不影响其他功能与打包。

---

# 放置 Git 安装文件（打进安装包）

ClaudeOne 同样会把官方 **Git for Windows** 安装文件一起打进安装包，让小白用户**无需预装 Git、无需开终端**，
在 App 内点「一键安装 Git」即可由程序自动静默安装（装到系统标准位置）。

## 操作步骤

1. 到 Git for Windows 官网下载 **64 位 `.exe` 安装包**：
   - https://git-scm.com/download/win
   - 例如：`Git-2.47.0-64-bit.exe`
2. 把下载的文件**重命名为 `git-installer.exe`**，放到本目录（`src/ClaudeOne/build/git-installer.exe`）。
3. 正常打包：
   ```powershell
   npm run package
   ```
   electron-builder 会通过 `extraResources` 把它拷到安装后的 `resources/git-installer.exe`。

## 运行时行为

- 程序通过 `resolveGitInstaller()` 找到该文件（生产环境在 `process.resourcesPath` 下）。
- 点「一键安装 Git」后，以管理员身份（会弹一次 UAC 授权）运行：
  ```
  git-installer.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /NOCANCEL /SP-
  ```
  官方安装包基于 Inno Setup，`/VERYSILENT` **全静默、不显示任何向导页、不需要点"下一步"**，实现"自动点击安装"。
- 装完自动把 `C:\Program Files\Git\cmd` 补进当前进程 PATH，无需重启 App 即可调用刚装好的 `git`。

## 说明

- 本目录的 `.exe` **不纳入版本库**（体积大）。请在本地 / CI 打包前放置。
- 若未放置该文件，App 会自动退回「去官网下载」提示，不影响其他功能与打包。

---

# 打包与发版（国内务必看）

## 一、用镜像源打包（必须）

直接 `npm run package` 会因 GitHub 下载源 DNS 解析失败而报错。**国内打包必须先设镜像环境变量**：

```powershell
cd src\ClaudeOne
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run package
```

## 二、当前打包目标：portable 单文件

`package.json` 的 win target 为 `portable`，产物是**单个 exe**（如 `ClaudeOne-0.1.1-win-x64.exe`）。
发给用户一个 exe 即可，双击免安装、自解压到临时目录启动；配置存于 `%APPDATA%\claudeone`，**换 exe 升级不丢配置**。

## 三、发新版铁律：先改版本号

每次发版**务必先把 `package.json` 的 `version` 加一位**（如 `0.1.1` → `0.1.2`）。
portable 的自解压目录按版本命名（`unpackDirName: ClaudeOne-${version}`），
**不改版本号会复用旧缓存代码 → 用户跑到的还是旧版**。

## 四、常见坑：app.asar 被占用导致打包失败

报错 `remove ...\win-unpacked\resources\app.asar: The process cannot access the file ...`
即旧构建文件被系统服务（Windows Defender 实时扫描 / 搜索索引器）占用、无法覆盖。

- 先确认**没有 ClaudeOne 进程在跑**（`tasklist /FI "IMAGENAME eq ClaudeOne.exe"`）。
- 仍被占用时，让 electron-builder 输出到**全新目录**绕开被锁的旧目录：
  ```powershell
  npx electron-builder --win --config.directories.output=release
  ```
- 被锁的 `dist\win-unpacked` 可重启电脑后再删，不影响使用。

## 五、其他提醒

- 日志若出现 `default Electron icon is used`，表示用的是默认 Electron 图标；
  需要自定义图标时在 `build` 配置里设 `icon` 指向 `.ico` 文件。
