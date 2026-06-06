const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pomodoroApi", {
  getWeeklyStats: () => ipcRenderer.invoke("stats:get-weekly"),
  recordCompletion: (workMinutes) => ipcRenderer.invoke("stats:record-completion", { workMinutes }),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  setCompact: (compact) => ipcRenderer.invoke("window:set-compact", compact),
  closeWindow: () => ipcRenderer.invoke("window:close")
});
