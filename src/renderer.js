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
  alwaysOnTop: false
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
    await recordWorkCompletion();
    beginPhase("break");
    return;
  }

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
elements.weekDetailsButton.addEventListener("click", openWeekDialog);
elements.weekDialogXButton.addEventListener("click", closeWeekDialog);
elements.weekDialogCloseButton.addEventListener("click", closeWeekDialog);
elements.weekDialog.addEventListener("click", (event) => {
  if (event.target.matches("[data-week-dialog-close]")) {
    closeWeekDialog();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.weekDialog.hidden) {
    closeWeekDialog();
  }
});

[elements.pomodoroCount, elements.workMinutes, elements.breakMinutes].forEach((input) => {
  input.addEventListener("input", applySettingsToIdleDisplay);
});

refreshStats();
applySettingsToIdleDisplay();
updateUi();
