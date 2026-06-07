# 个人番茄钟

这个项目现在有两个版本：

- 轻量原生版：`dist-lite\PomodoroLite.exe`
- Electron 版：`dist\Pomodoro\Pomodoro.exe`

推荐日常使用轻量原生版。它只有一个 exe，体积约 18 KB，不需要 Node.js、npm 或 Electron。

## 下载和使用

如果只是想直接使用，推荐下载仓库后运行轻量原生版：

1. 点击 GitHub 页面右上方的 `Code`。
2. 选择 `Download ZIP`，下载后解压。
3. 双击运行：

```text
dist-lite\PomodoroLite.exe
```

也可以使用 Git 克隆：

```powershell
git clone https://github.com/retrieve08/FanqieClock.git
cd FanqieClock
```

克隆后同样可以直接双击 `dist-lite\PomodoroLite.exe`。轻量原生版不需要安装 Node.js、npm 或 Electron；Windows 10/11 通常可以直接运行。

如果想从源码运行 Electron 版，需要先安装 Node.js 和 npm，然后执行：

```powershell
npm install
npm start
```

## 为什么做这个番茄钟？

微软自带时钟足够简单，但番茄钟设置不够灵活：不能方便地自定义固定运行次数、工作时长和休息时长，也缺少每周总结。

许多市面上的番茄钟软件支持更多设置，但常见问题是功能付费、窗口不够轻便，或者没有折叠小窗和可伸缩窗口。

这个项目希望提供一个更轻量、更贴近日常工作流的选择：

- 自由设置番茄钟数量、工作时长和休息时长。
- 支持拖动边框调整窗口大小。
- 支持折叠成小窗，减少对工作的干扰。
- 支持为工作结束和休息结束分别设置自定义提示音。
- 自动记录每天工作时间，并提供每周总结。
- 轻量、简单，不依赖复杂账号或付费功能。

## 界面预览

### 主界面

![主界面](docs/images/main-window.png)

### 折叠界面

![折叠界面](docs/images/folded-window.png)

### 每周总结

![每周总结](docs/images/week-summary.png)

### 提示音设置

![提示音设置](docs/images/audio-settings.png)

## 运行轻量版

直接双击：

```text
dist-lite\PomodoroLite.exe
```

也可以双击项目根目录里的：

```text
start-pomodoro-lite.bat
```

## 轻量版功能

- 默认出现在屏幕右上角。
- 可以设置接下来要完成几个番茄钟。
- 可以设置工作分钟和休息分钟。
- 自动执行 `工作 -> 休息`，重复指定数量，最后一个番茄后也会休息。
- 可暂停、继续、停止。
- 可切换置顶。
- 可折叠成一行倒计时。
- 可自定义工作结束和休息结束时播放的音频，支持选择本地文件或录音；未设置时使用默认提示音。
- 默认展示今日番茄工作时间。
- 点击按钮查看本周每天番茄工作时间，按每天时长从高到低排列。

## 数据保存

轻量版统计数据保存在：

```text
%APPDATA%\PomodoroLite\pomodoro-stats.csv
```

轻量版自定义提示音配置和录音保存在：

```text
%APPDATA%\PomodoroLite\
```

只统计工作时间，不统计休息时间。

## 传到另一台电脑

轻量版只需要传这个文件：

```text
dist-lite\PomodoroLite.exe
```

另一台电脑通常不需要安装 Node.js、npm、Electron。它依赖 Windows 自带的 .NET Framework 4.x；Windows 10/11 通常已经内置。

## 重新构建轻量版

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-lite.ps1
```

也可以使用 npm 脚本：

```powershell
npm run build:lite
```

## Electron 版

从源码运行 Electron 版：

```powershell
npm install
npm start
```

打包 Windows 版：

```powershell
npm run package:win
```

打包后 Electron 版会生成在：

```text
dist\Pomodoro\Pomodoro.exe
```

这个版本需要整个 `dist\Pomodoro` 文件夹一起移动，体积会大很多。
