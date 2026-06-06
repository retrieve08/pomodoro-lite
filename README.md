# 个人番茄钟

这个项目现在有两个版本：

- 轻量原生版：`dist-lite\PomodoroLite.exe`
- Electron 版：`dist\Pomodoro\Pomodoro.exe`

推荐日常使用轻量原生版。它只有一个 exe，体积约 18 KB，不需要 Node.js、npm 或 Electron。

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
- 默认展示今日番茄工作时间。
- 点击按钮查看本周每天番茄工作时间，按每天时长从高到低排列。

## 数据保存

轻量版统计数据保存在：

```text
%APPDATA%\PomodoroLite\pomodoro-stats.csv
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
