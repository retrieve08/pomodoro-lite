const api = window.pomodoroApi;

const elements = {
  app: document.getElementById("app"),
  fullPanel: document.getElementById("fullPanel"),
  compactBar: document.getElementById("compactBar"),
  compactPhase: document.getElementById("compactPhase"),
  compactTime: document.getElementById("compactTime"),
  expandButton: document.getElementById("expandButton"),
  pinButton: document.getElementById("pinButton"),
  compactButton: document.getElementById("compactButton"),
  closeButton: document.getElementById("closeButton"),
  phaseTitle: document.getElementById("phaseTitle"),
  timeDisplay: document.getElementById("timeDisplay"),
  progressText: document.getElementById("progressText"),
  pomodoroCount: document.getElementById("pomodoroCount"),
  workMinutes: document.getElementById("workMinutes"),
  breakMinutes: document.getElementById("breakMinutes"),
  settingsForm: document.getElementById("settingsForm"),
  audioSettingsButton: document.getElementById("audioSettingsButton"),
  audioDialog: document.getElementById("audioDialog"),
  audioDialogXButton: document.getElementById("audioDialogXButton"),
  audioDialogCloseButton: document.getElementById("audioDialogCloseButton"),
  audioStatus: document.getElementById("audioStatus"),
  workAudioName: document.getElementById("workAudioName"),
  breakAudioName: document.getElementById("breakAudioName"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  stopButton: document.getElementById("stopButton"),
  errorMessage: document.getElementById("errorMessage"),
  todayMinutes: document.getElementById("todayMinutes"),
  weekDetailsButton: document.getElementById("weekDetailsButton"),
  weekDialog: document.getElementById("weekDialog"),
  weekDialogXButton: document.getElementById("weekDialogXButton"),
  weekDialogCloseButton: document.getElementById("weekDialogCloseButton"),
  weekRows: document.getElementById("weekRows")
};

const state = {
  status: "idle",
  phase: "work",
  currentPomodoro: 1,
  totalPomodoros: 2,
  workMinutes: 25,
  breakMinutes: 5,
  remainingSeconds: 25 * 60,
  phaseTotalSeconds: 25 * 60,
  intervalId: null,
  compact: false,
  alwaysOnTop: false,
  audioContext: null,
  audioSettings: {
    workEndAudioPath: "",
    workEndAudioName: "",
    workEndAudioUrl: "",
    breakEndAudioPath: "",
    breakEndAudioName: "",
    breakEndAudioUrl: ""
  },
  recording: null
};

function parsePositiveInteger(input) {
  const value = Number(input.value);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function getSettings() {
  const totalPomodoros = parsePositiveInteger(elements.pomodoroCount);
  const workMinutes = parsePositiveInteger(elements.workMinutes);
  const breakMinutes = parsePositiveInteger(elements.breakMinutes);

  if (!totalPomodoros || !workMinutes || !breakMinutes) {
    throw new Error("番茄数量、工作分钟、休息分钟都需要是正整数。");
  }

  return { totalPomodoros, workMinutes, breakMinutes };
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getPhaseLabel() {
  if (state.status === "idle") {
    return "待开始";
  }

  if (state.status === "done") {
    return "已完成";
  }

  return state.phase === "work" ? "工作中" : "休息中";
}

function updateProgressText() {
  if (state.status === "idle") {
    elements.progressText.textContent = "设置好后开始";
    return;
  }

  if (state.status === "done") {
    elements.progressText.textContent = `已完成 ${state.totalPomodoros} 个番茄`;
    return;
  }

  const paused = state.status === "paused" ? " · 已暂停" : "";
  elements.progressText.textContent = `第 ${state.currentPomodoro} / ${state.totalPomodoros} 个番茄 · ${state.phase === "work" ? "工作" : "休息"}${paused}`;
}

function updateUi() {
  const formatted = formatTime(state.remainingSeconds);
  const label = getPhaseLabel();

  elements.phaseTitle.textContent = label;
  elements.timeDisplay.textContent = formatted;
  elements.compactTime.textContent = formatted;
  elements.compactPhase.textContent = label;
  elements.pauseButton.textContent = state.status === "paused" ? "继续" : "暂停";
  elements.pauseButton.disabled = !["running", "paused"].includes(state.status);
  elements.stopButton.disabled = !["running", "paused", "done"].includes(state.status);
  elements.startButton.disabled = ["running", "paused"].includes(state.status);
  elements.settingsForm.classList.toggle("disabled", ["running", "paused"].includes(state.status));

  updateProgressText();
}

async function refreshStats() {
  const stats = await api.getWeeklyStats();
  renderStats(stats);
}

function renderStats(stats) {
  elements.todayMinutes.textContent = `${stats.todayMinutes} 分钟`;
  elements.weekRows.innerHTML = "";

  const sortedDays = [...stats.weekDays].sort((left, right) => {
    if (right.minutes !== left.minutes) {
      return right.minutes - left.minutes;
    }

    return stats.weekDays.indexOf(left) - stats.weekDays.indexOf(right);
  });
  const maxMinutes = Math.max(1, ...sortedDays.map((day) => day.minutes));

  sortedDays.forEach((day) => {
    const row = document.createElement("div");
    row.className = "week-row";
    const fillWidth = day.minutes === 0 ? 0 : Math.max(8, Math.round((day.minutes / maxMinutes) * 100));
    row.innerHTML = `
      <span class="week-day">${day.label}</span>
      <span class="week-bar" aria-hidden="true"><span class="week-fill" style="width: ${fillWidth}%"></span></span>
      <strong>${day.minutes} 分钟</strong>
    `;
    elements.weekRows.appendChild(row);
  });
}

function getAudioKeys(phase) {
  return phase === "work"
    ? { nameKey: "workEndAudioName", urlKey: "workEndAudioUrl", pathKey: "workEndAudioPath" }
    : { nameKey: "breakEndAudioName", urlKey: "breakEndAudioUrl", pathKey: "breakEndAudioPath" };
}

function updateAudioSettingsUi() {
  elements.workAudioName.textContent = state.audioSettings.workEndAudioName || "默认提示音";
  elements.breakAudioName.textContent = state.audioSettings.breakEndAudioName || "默认提示音";
}

async function loadAudioSettings() {
  state.audioSettings = await api.getAudioSettings();
  updateAudioSettingsUi();
}

async function persistAudioSettings(nextSettings) {
  state.audioSettings = await api.saveAudioSettings(nextSettings);
  updateAudioSettingsUi();
}

function setAudioStatus(message) {
  elements.audioStatus.textContent = message || "";
}

function openAudioDialog() {
  elements.audioDialog.hidden = false;
  setAudioStatus("");
  elements.audioDialogCloseButton.focus();
}

function closeAudioDialog() {
  elements.audioDialog.hidden = true;
  elements.audioSettingsButton.focus();
}

function clearTimer() {
  if (state.intervalId) {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function startInterval() {
  clearTimer();
  state.intervalId = window.setInterval(tick, 1000);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  return state.audioContext;
}

async function unlockNotificationAudio() {
  const audioContext = getAudioContext();

  if (audioContext?.state === "suspended") {
    await audioContext.resume();
  }
}

function scheduleTone(audioContext, startTime, frequency, duration, type = "sine") {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
  gain.gain.setValueAtTime(0.18, Math.max(startTime + 0.03, endTime - 0.12));
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

function playDefaultPhaseEndSound(endedPhase) {
  const audioContext = getAudioContext();

  if (!audioContext || audioContext.state === "suspended") {
    return;
  }

  const startTime = audioContext.currentTime + 0.03;
  const notes =
    endedPhase === "work"
      ? [
          [523.25, 0, 0.42],
          [659.25, 0.6, 0.42],
          [783.99, 1.2, 0.56]
        ]
      : [
          [783.99, 0, 0.42],
          [659.25, 0.6, 0.42],
          [523.25, 1.2, 0.56]
        ];

  notes.forEach(([frequency, offset, duration]) => {
    scheduleTone(audioContext, startTime + offset, frequency, duration, endedPhase === "work" ? "sine" : "triangle");
  });
}

async function playPhaseEndSound(endedPhase) {
  const keys = getAudioKeys(endedPhase);
  const audioUrl = state.audioSettings[keys.urlKey];

  if (!audioUrl) {
    playDefaultPhaseEndSound(endedPhase);
    return;
  }

  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch {
    playDefaultPhaseEndSound(endedPhase);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function findRecordButton(phase) {
  return elements.audioDialog.querySelector(`[data-audio-action="record"][data-phase="${phase}"]`);
}

async function chooseAudioFile(phase) {
  setAudioStatus("正在选择音频...");
  const settings = await api.chooseAudioFile(phase);

  if (settings) {
    state.audioSettings = settings;
    updateAudioSettingsUi();
    setAudioStatus("已保存音频。");
  } else {
    setAudioStatus("");
  }
}

async function clearAudioFile(phase) {
  const keys = getAudioKeys(phase);
  await persistAudioSettings({
    ...state.audioSettings,
    [keys.pathKey]: "",
    [keys.nameKey]: ""
  });
  setAudioStatus("已恢复默认提示音。");
}

async function stopRecording() {
  if (!state.recording) {
    return;
  }

  state.recording.mediaRecorder.stop();
}

async function startRecording(phase) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setAudioStatus("当前环境不支持录音。");
    return;
  }

  if (state.recording) {
    await stopRecording();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const button = findRecordButton(phase);

    state.recording = { phase, mediaRecorder, stream, chunks };
    button?.classList.add("is-recording");
    if (button) {
      button.textContent = "停止";
    }
    setAudioStatus("正在录音，再点一次停止。");

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", async () => {
      const activeRecording = state.recording;
      state.recording = null;
      stream.getTracks().forEach((track) => track.stop());
      button?.classList.remove("is-recording");
      if (button) {
        button.textContent = "录音";
      }

      if (!activeRecording || chunks.length === 0) {
        setAudioStatus("没有录到音频。");
        return;
      }

      try {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
        const dataUrl = await blobToDataUrl(blob);
        state.audioSettings = await api.saveRecordedAudio(phase, dataUrl);
        updateAudioSettingsUi();
        setAudioStatus("录音已保存。");
      } catch {
        setAudioStatus("录音保存失败。");
      }
    });

    mediaRecorder.start();
  } catch {
    setAudioStatus("无法访问麦克风。");
  }
}

async function handleAudioAction(event) {
  const button = event.target.closest("[data-audio-action]");

  if (!button) {
    return;
  }

  const phase = button.dataset.phase;
  const action = button.dataset.audioAction;

  try {
    if (action === "choose") {
      await chooseAudioFile(phase);
    } else if (action === "record") {
      await startRecording(phase);
    } else if (action === "preview") {
      await playPhaseEndSound(phase);
    } else if (action === "clear") {
      await clearAudioFile(phase);
    }
  } catch {
    setAudioStatus("操作失败，请重试。");
  }
}

async function recordWorkCompletion() {
  const stats = await api.recordCompletion(state.workMinutes);
  renderStats(stats);
}

function beginPhase(phase) {
  state.phase = phase;
  state.phaseTotalSeconds = (phase === "work" ? state.workMinutes : state.breakMinutes) * 60;
  state.remainingSeconds = state.phaseTotalSeconds;
  updateUi();
}

async function advancePhase() {
  if (state.phase === "work") {
    await playPhaseEndSound("work");
    await recordWorkCompletion();
    beginPhase("break");
    return;
  }

  await playPhaseEndSound("break");

  if (state.currentPomodoro >= state.totalPomodoros) {
    clearTimer();
    state.status = "done";
    state.remainingSeconds = 0;
    updateUi();
    return;
  }

  state.currentPomodoro += 1;
  beginPhase("work");
}

async function tick() {
  if (state.status !== "running") {
    return;
  }

  if (state.remainingSeconds > 0) {
    state.remainingSeconds -= 1;
    updateUi();
    return;
  }

  await advancePhase();
}

function applySettingsToIdleDisplay() {
  if (state.status !== "idle") {
    return;
  }

  try {
    const settings = getSettings();
    state.totalPomodoros = settings.totalPomodoros;
    state.workMinutes = settings.workMinutes;
    state.breakMinutes = settings.breakMinutes;
    state.phaseTotalSeconds = settings.workMinutes * 60;
    state.remainingSeconds = state.phaseTotalSeconds;
    elements.errorMessage.textContent = "";
    updateUi();
  } catch {
    // Validation is shown when starting; while typing, avoid noisy errors.
  }
}

function startSession() {
  try {
    const settings = getSettings();
    unlockNotificationAudio().catch(() => {});
    Object.assign(state, settings, {
      status: "running",
      phase: "work",
      currentPomodoro: 1,
      remainingSeconds: settings.workMinutes * 60,
      phaseTotalSeconds: settings.workMinutes * 60
    });
    elements.errorMessage.textContent = "";
    startInterval();
    updateUi();
  } catch (error) {
    elements.errorMessage.textContent = error.message;
  }
}

function togglePause() {
  if (state.status === "running") {
    state.status = "paused";
    clearTimer();
  } else if (state.status === "paused") {
    state.status = "running";
    startInterval();
  }

  updateUi();
}

function stopSession() {
  clearTimer();
  state.status = "idle";
  state.phase = "work";
  state.currentPomodoro = 1;
  applySettingsToIdleDisplay();
  updateUi();
}

async function togglePin() {
  const result = await api.toggleAlwaysOnTop();
  state.alwaysOnTop = result.alwaysOnTop;
  elements.pinButton.classList.toggle("active", state.alwaysOnTop);
  elements.pinButton.title = state.alwaysOnTop ? "取消置顶" : "置顶";
}

async function setCompact(compact) {
  state.compact = compact;
  await api.setCompact(compact);
  elements.app.classList.toggle("is-compact", compact);
}

function openWeekDialog() {
  elements.weekDialog.hidden = false;
  elements.weekDialogCloseButton.focus();
}

function closeWeekDialog() {
  elements.weekDialog.hidden = true;
  elements.weekDetailsButton.focus();
}

elements.startButton.addEventListener("click", startSession);
elements.pauseButton.addEventListener("click", togglePause);
elements.stopButton.addEventListener("click", stopSession);
elements.pinButton.addEventListener("click", togglePin);
elements.compactButton.addEventListener("click", () => setCompact(true));
elements.expandButton.addEventListener("click", () => setCompact(false));
elements.closeButton.addEventListener("click", () => api.closeWindow());
elements.audioSettingsButton.addEventListener("click", openAudioDialog);
elements.audioDialogXButton.addEventListener("click", closeAudioDialog);
elements.audioDialogCloseButton.addEventListener("click", closeAudioDialog);
elements.audioDialog.addEventListener("click", (event) => {
  if (event.target.matches("[data-audio-dialog-close]")) {
    closeAudioDialog();
  }
});
elements.audioDialog.addEventListener("click", handleAudioAction);
elements.weekDetailsButton.addEventListener("click", openWeekDialog);
elements.weekDialogXButton.addEventListener("click", closeWeekDialog);
elements.weekDialogCloseButton.addEventListener("click", closeWeekDialog);
elements.weekDialog.addEventListener("click", (event) => {
  if (event.target.matches("[data-week-dialog-close]")) {
    closeWeekDialog();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.audioDialog.hidden) {
    closeAudioDialog();
    return;
  }

  if (event.key === "Escape" && !elements.weekDialog.hidden) {
    closeWeekDialog();
  }
});

[elements.pomodoroCount, elements.workMinutes, elements.breakMinutes].forEach((input) => {
  input.addEventListener("input", applySettingsToIdleDisplay);
});

loadAudioSettings().catch(() => {});
refreshStats();
applySettingsToIdleDisplay();
updateUi();
