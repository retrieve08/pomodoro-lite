const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pomodoroApi", {
  getWeeklyStats: () => ipcRenderer.invoke("stats:get-weekly"),
  recordCompletion: (workMinutes) => ipcRenderer.invoke("stats:record-completion", { workMinutes }),
  getAudioSettings: () => ipcRenderer.invoke("audio:get-settings"),
  saveAudioSettings: (settings) => ipcRenderer.invoke("audio:save-settings", settings),
  chooseAudioFile: (phase) => ipcRenderer.invoke("audio:choose-file", phase),
  saveRecordedAudio: (phase, dataUrl) => ipcRenderer.invoke("audio:save-recording", { phase, dataUrl }),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  setCompact: (compact) => ipcRenderer.invoke("window:set-compact", compact),
  closeWindow: () => ipcRenderer.invoke("window:close")
});
