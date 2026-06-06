const { app, BrowserWindow, ipcMain, screen } = require("electron");
const fs = require("fs/promises");
const path = require("path");

const NORMAL_SIZE = { width: 360, height: 540 };
const COMPACT_SIZE = { width: 300, height: 64 };
const WINDOW_MARGIN = 16;

let mainWindow;
let isAlwaysOnTop = false;
let isCompact = false;

function getStatsFilePath() {
  return path.join(app.getPath("userData"), "pomodoro-stats.json");
}

async function ensureStatsFile() {
  const filePath = getStatsFilePath();

  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ completions: [] }, null, 2), "utf8");
  }

  return filePath;
}

async function readStats() {
  const filePath = await ensureStatsFile();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      completions: Array.isArray(parsed.completions) ? parsed.completions : []
    };
  } catch {
    return { completions: [] };
  }
}

async function writeStats(stats) {
  const filePath = await ensureStatsFile();
  await fs.writeFile(filePath, JSON.stringify(stats, null, 2), "utf8");
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + offset);
  return weekStart;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function summarizeThisWeek(completions) {
  const weekStart = getWeekStart(new Date());
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  const todayKey = getDateKey(new Date());
  const weekDays = Array.from({ length: 7 }, (_item, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      date: getDateKey(date),
      label: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index],
      minutes: 0
    };
  });

  const thisWeek = completions.filter((entry) => {
    const completedAt = new Date(entry.completedAt);
    return completedAt >= weekStart && completedAt < nextWeek;
  });

  thisWeek.forEach((entry) => {
    const completedAt = new Date(entry.completedAt);
    const dateKey = getDateKey(completedAt);
    const day = weekDays.find((item) => item.date === dateKey);

    if (day) {
      day.minutes += Number(entry.workMinutes || 0);
    }
  });

  return {
    todayMinutes: weekDays.find((day) => day.date === todayKey)?.minutes || 0,
    weekDays,
    weekStart: weekStart.toISOString(),
    statsPath: getStatsFilePath()
  };
}

async function getWeeklyStats() {
  const stats = await readStats();
  return summarizeThisWeek(stats.completions);
}

function positionTopRight(win) {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = display.workArea;
  const [width, height] = win.getSize();

  win.setBounds({
    x: bounds.x + bounds.width - width - WINDOW_MARGIN,
    y: bounds.y + WINDOW_MARGIN,
    width,
    height
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: NORMAL_SIZE.width,
    height: NORMAL_SIZE.height,
    minWidth: 280,
    minHeight: 64,
    resizable: true,
    frame: false,
    transparent: false,
    alwaysOnTop: isAlwaysOnTop,
    show: false,
    backgroundColor: "#f7f4ed",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.once("ready-to-show", () => {
    positionTopRight(mainWindow);
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("stats:get-weekly", async () => getWeeklyStats());

ipcMain.handle("stats:record-completion", async (_event, payload) => {
  const workMinutes = Number(payload?.workMinutes);

  if (!Number.isInteger(workMinutes) || workMinutes <= 0) {
    throw new Error("workMinutes must be a positive integer.");
  }

  const stats = await readStats();
  stats.completions.push({
    completedAt: new Date().toISOString(),
    workMinutes
  });
  await writeStats(stats);

  return summarizeThisWeek(stats.completions);
});

ipcMain.handle("window:toggle-always-on-top", () => {
  if (!mainWindow) {
    return { alwaysOnTop: false };
  }

  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  return { alwaysOnTop: isAlwaysOnTop };
});

ipcMain.handle("window:set-compact", (_event, compact) => {
  if (!mainWindow) {
    return { compact: isCompact };
  }

  isCompact = Boolean(compact);
  const size = isCompact ? COMPACT_SIZE : NORMAL_SIZE;
  mainWindow.setMinimumSize(isCompact ? COMPACT_SIZE.width : 280, isCompact ? COMPACT_SIZE.height : 64);
  mainWindow.setSize(size.width, size.height, true);
  return { compact: isCompact };
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});
