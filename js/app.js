// app.js — main application logic

let data = loadData();

const $ = id => document.getElementById(id);

const subjectListEl = $("subject-list");
const sessionTbody = $("session-tbody");
const emptyState = $("empty-state");
const streakCountEl = $("streak-count");
const streakUnitEl = $("streak-unit");
const showMoreBtn = $("show-more-btn");
const filterChip = $("filter-chip");
const filterText = $("filter-text");

const statTodayEl = $("stat-today");
const statWeekEl = $("stat-week");
const statTotalEl = $("stat-total");
const statSessionsEl = $("stat-sessions");
const goalFill = $("goal-fill");
const goalText = $("goal-text");
const goalInput = $("goal-input");

const sessionModal = $("session-modal");
const sessionForm = $("session-form");
const sessionSubjectSelect = $("session-subject");
const sessionDurationInput = $("session-duration");
const sessionDateInput = $("session-date");
const sessionEditIdInput = $("session-edit-id");
const sessionModalTitle = $("session-modal-title");
const sessionSubmitBtn = $("session-submit");
const subjectGoalInput = $("subject-goal");
const backupFileInput = $("backup-file");

const subjectModal = $("subject-modal");
const subjectForm = $("subject-form");
const subjectModalTitle = $("subject-modal-title");
const subjectEditIdInput = $("subject-edit-id");
const subjectNameInput = $("subject-name");
const subjectColorInput = $("subject-color");
const deleteSubjectBtn = $("delete-subject-btn");

const pomodoroBox = $("pomodoro-box");
const pomodoroSubjectSelect = $("pomodoro-subject");
const pomodoroTimeEl = $("pomodoro-time");
const pomodoroModeEl = $("pomodoro-mode");
const pomodoroStartBtn = $("pomodoro-start");
const pomodoroResetBtn = $("pomodoro-reset");
const pomodoroSkipBtn = $("pomodoro-skip");

const chartCanvas = $("subject-chart");

// ---- UI state ----
let chartDays = 7;
let filterSubjectId = null;
let showAll = false;
const RECENT_LIMIT = 10;

// ---- Helpers ----

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function minutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function subjectById(id) {
  return data.subjects.find(s => s.id === id);
}

// Date key of this week's Monday, used for weekly subject goals
function weekStartKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}

function friendlyDate(key) {
  const today = todayKey();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return "Today";
  if (key === dateKey(y)) return "Yesterday";
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function showToast(message, actionLabel, onAction) {
  const root = $("toast-root");
  root.innerHTML = "";
  const toast = document.createElement("div");
  toast.className = "toast";
  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);

  if (actionLabel) {
    const btn = document.createElement("button");
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      onAction();
      toast.remove();
    });
    toast.appendChild(btn);
  }
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

// ---- Rendering ----

function render() {
  $("today-date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long"
  });
  renderSubjectList();
  renderStats();
  renderSessionTable();
  renderSubjectChart(chartCanvas, data.subjects, data.sessions, chartDays);
  renderHeatmap($("heatmap"), data.sessions);
  populateSubjectSelect();
}

function renderSubjectList() {
  subjectListEl.innerHTML = "";

  if (data.subjects.length === 0) {
    const li = document.createElement("li");
    li.className = "subject-empty";
    li.textContent = "No subjects yet. Add one to start logging.";
    subjectListEl.appendChild(li);
    return;
  }

  data.subjects.forEach(subj => {
    const totalMins = data.sessions
      .filter(s => s.subjectId === subj.id)
      .reduce((sum, s) => sum + s.duration, 0);

    const goalHours = subj.weeklyGoal || 0;
    let goalHtml = "";
    if (goalHours > 0) {
      const weekMins = data.sessions
        .filter(s => s.subjectId === subj.id && s.date >= weekStartKey())
        .reduce((sum, s) => sum + s.duration, 0);
      const pct = Math.min(100, Math.round((weekMins / 60 / goalHours) * 100));
      goalHtml = `
        <div class="subject-goal">
          <div class="goal-bar" role="progressbar" aria-label="Weekly goal for ${esc(subj.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
            <div class="goal-fill ${pct >= 100 ? "done" : ""}" style="width:${pct}%"></div>
          </div>
          <span class="subject-goal-text">${(weekMins / 60).toFixed(1)} of ${goalHours}h this week</span>
        </div>`;
    }

    const li = document.createElement("li");
    li.dataset.id = subj.id;
    li.title = "Show only this subject's sessions";
    if (subj.id === filterSubjectId) li.classList.add("active");
    li.innerHTML = `
      <div class="subject-row">
        <span class="subject-dot" style="background:${esc(subj.color)}"></span>
        <span class="subject-name">${esc(subj.name)}</span>
        <span class="subject-hours">${(totalMins / 60).toFixed(1)}h</span>
        <span class="subject-actions">
          <button class="icon-btn edit-subject-btn" data-id="${esc(subj.id)}" title="Edit subject" aria-label="Edit ${esc(subj.name)}">✎</button>
          <button class="icon-btn delete-subject-list-btn" data-id="${esc(subj.id)}" title="Delete subject" aria-label="Delete ${esc(subj.name)}">✕</button>
        </span>
      </div>
      ${goalHtml}
    `;
    subjectListEl.appendChild(li);
  });
}

subjectListEl.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-subject-btn");
  const delBtn = e.target.closest(".delete-subject-list-btn");
  const li = e.target.closest("li[data-id]");

  if (editBtn) {
    openSubjectModal(editBtn.dataset.id);
  } else if (delBtn) {
    confirmDeleteSubject(delBtn.dataset.id);
  } else if (li) {
    filterSubjectId = filterSubjectId === li.dataset.id ? null : li.dataset.id;
    showAll = false;
    render();
  }
});

function confirmDeleteSubject(id) {
  const subj = subjectById(id);
  if (!subj) return;
  const count = data.sessions.filter(s => s.subjectId === id).length;
  const msg = count
    ? `Delete "${subj.name}" and its ${count} logged session${count === 1 ? "" : "s"}? This cannot be undone.`
    : `Delete "${subj.name}"?`;
  if (!confirm(msg)) return false;
  deleteSubject(data, id);
  if (filterSubjectId === id) filterSubjectId = null;
  render();
  showToast(`Deleted "${subj.name}"`);
  return true;
}

function renderStats() {
  const today = todayKey();
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekCutoff = dateKey(weekStart);

  const todayMins = data.sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);
  const weekMins = data.sessions
    .filter(s => s.date >= weekCutoff)
    .reduce((sum, s) => sum + s.duration, 0);
  const totalMins = data.sessions.reduce((sum, s) => sum + s.duration, 0);

  statTodayEl.textContent = minutesToLabel(todayMins);
  statWeekEl.textContent = minutesToLabel(weekMins);
  statTotalEl.textContent = minutesToLabel(totalMins);
  statSessionsEl.textContent = data.sessions.length;

  const goal = data.settings.dailyGoal || 120;
  const pct = Math.min(100, Math.round((todayMins / goal) * 100));
  goalFill.style.width = pct + "%";
  goalFill.classList.toggle("done", pct >= 100);
  goalText.textContent = pct >= 100 ? "Goal reached, " : `${pct}% of `;
  goalInput.value = goal;
  goalFill.parentElement.setAttribute("aria-valuenow", pct);

  const streak = calculateStreak();
  streakCountEl.textContent = streak;
  streakUnitEl.textContent = streak === 1 ? "day" : "days";
}

function calculateStreak() {
  const studiedDates = new Set(data.sessions.map(s => s.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If nothing is logged today yet, the streak can still count from yesterday
  if (!studiedDates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (studiedDates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderSessionTable() {
  sessionTbody.innerHTML = "";

  let list = [...data.sessions];
  if (filterSubjectId) list = list.filter(s => s.subjectId === filterSubjectId);
  list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  const visible = showAll ? list : list.slice(0, RECENT_LIMIT);

  // Filter chip
  const fs = filterSubjectId && subjectById(filterSubjectId);
  filterChip.classList.toggle("hidden", !fs);
  if (fs) filterText.textContent = `Showing ${fs.name}`;

  // Empty state
  emptyState.classList.toggle("hidden", visible.length > 0);
  if (visible.length === 0) {
    emptyState.textContent = fs
      ? "No sessions for this subject yet."
      : "No sessions yet. Press “Log a session” to add your first one.";
  }

  // Show more / less
  const hasMore = list.length > RECENT_LIMIT;
  showMoreBtn.classList.toggle("hidden", !hasMore);
  showMoreBtn.textContent = showAll ? "Show fewer" : `Show all ${list.length} sessions`;

  visible.forEach(session => {
    const subj = subjectById(session.subjectId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="subject-dot inline-dot" style="background:${subj ? esc(subj.color) : "#666"}"></span>${subj ? esc(subj.name) : "Unknown"}</td>
      <td>${minutesToLabel(session.duration)}</td>
      <td>${friendlyDate(session.date)}</td>
      <td>
        <div class="row-actions">
          <button class="edit-btn" data-id="${esc(session.id)}" aria-label="Edit session">Edit</button>
          <button class="delete-btn" data-id="${esc(session.id)}" aria-label="Delete session">Delete</button>
        </div>
      </td>
    `;
    sessionTbody.appendChild(tr);
  });
}

sessionTbody.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    openSessionModal(editBtn.dataset.id);
    return;
  }
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const session = data.sessions.find(s => s.id === btn.dataset.id);
  if (!session) return;
  deleteSession(data, session.id);
  render();
  showToast("Session deleted.", "Undo", () => {
    addSession(data, session);
    render();
  });
});

showMoreBtn.addEventListener("click", () => {
  showAll = !showAll;
  renderSessionTable();
});

$("clear-filter").addEventListener("click", () => {
  filterSubjectId = null;
  showAll = false;
  render();
});

function populateSubjectSelect() {
  const prevSession = sessionSubjectSelect.value;
  const prevPomo = pomodoroSubjectSelect.value;
  sessionSubjectSelect.innerHTML = "";
  pomodoroSubjectSelect.innerHTML = "";

  data.subjects.forEach(subj => {
    const opt = document.createElement("option");
    opt.value = subj.id;
    opt.textContent = subj.name;
    sessionSubjectSelect.appendChild(opt);
    pomodoroSubjectSelect.appendChild(opt.cloneNode(true));
  });

  if (subjectById(prevSession)) sessionSubjectSelect.value = prevSession;
  if (subjectById(prevPomo)) pomodoroSubjectSelect.value = prevPomo;
}

// ---- Chart controls ----

document.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    chartDays = parseInt(btn.dataset.days, 10);
    document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b === btn));
    $("chart-sub").textContent = `last ${chartDays} days`;
    renderSubjectChart(chartCanvas, data.subjects, data.sessions, chartDays);
  });
});

chartCanvas.addEventListener("mousemove", (e) => {
  const rect = chartCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const bar = (chartCanvas._bars || []).find(b => x >= b.x && x <= b.x + b.w);
  chartCanvas.title = bar ? bar.text : "";
});

window.addEventListener("resize", () => {
  renderSubjectChart(chartCanvas, data.subjects, data.sessions, chartDays);
});

// ---- Daily goal ----

goalInput.addEventListener("change", () => {
  const value = parseInt(goalInput.value, 10);
  if (!value || value < 15 || value > 1440) {
    goalInput.value = data.settings.dailyGoal;
    showToast("Enter a goal between 15 and 1440 minutes.");
    return;
  }
  saveSettings(data, { dailyGoal: value });
  renderStats();
});

// ---- Modals ----

function openModal(modal, focusEl) {
  modal.classList.remove("hidden");
  if (focusEl) focusEl.focus();
}

function closeModals() {
  sessionModal.classList.add("hidden");
  subjectModal.classList.add("hidden");
}

[sessionModal, subjectModal].forEach(modal => {
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) closeModals();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModals();
    return;
  }
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
  const modalOpen = !sessionModal.classList.contains("hidden") || !subjectModal.classList.contains("hidden");
  if (e.key.toLowerCase() === "n" && !typing && !modalOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    openSessionModal();
  }
});

// Opens the session form. Pass a session id to edit that session.
function openSessionModal(sessionId) {
  if (data.subjects.length === 0) {
    showToast("Add a subject first, then log your session.");
    openSubjectModal(null);
    return;
  }
  populateSubjectSelect();
  sessionDateInput.max = todayKey();

  const existing = typeof sessionId === "string" ? data.sessions.find(s => s.id === sessionId) : null;
  if (existing) {
    sessionModalTitle.textContent = "Edit study session";
    sessionSubmitBtn.textContent = "Save changes";
    sessionEditIdInput.value = existing.id;
    if (subjectById(existing.subjectId)) sessionSubjectSelect.value = existing.subjectId;
    sessionDurationInput.value = existing.duration;
    sessionDateInput.value = existing.date;
  } else {
    sessionModalTitle.textContent = "Log a study session";
    sessionSubmitBtn.textContent = "Save session";
    sessionEditIdInput.value = "";
    const last = data.settings.lastSubject;
    if (last && subjectById(last)) sessionSubjectSelect.value = last;
    sessionDurationInput.value = "";
    sessionDateInput.value = todayKey();
  }
  openModal(sessionModal, sessionDurationInput);
}

$("log-session-btn").addEventListener("click", () => openSessionModal());
$("cancel-session").addEventListener("click", closeModals);
$("add-subject-btn").addEventListener("click", () => openSubjectModal(null));
$("cancel-subject").addEventListener("click", closeModals);

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    sessionDurationInput.value = chip.dataset.min;
    sessionDurationInput.focus();
  });
});

function openSubjectModal(subjectId) {
  subjectNameInput.setCustomValidity("");
  if (subjectId) {
    const subj = subjectById(subjectId);
    if (!subj) return;
    subjectModalTitle.textContent = "Edit subject";
    subjectEditIdInput.value = subj.id;
    subjectNameInput.value = subj.name;
    subjectColorInput.value = subj.color;
    subjectGoalInput.value = subj.weeklyGoal || "";
    deleteSubjectBtn.classList.remove("hidden");
  } else {
    subjectModalTitle.textContent = "Add a subject";
    subjectEditIdInput.value = "";
    subjectForm.reset();
    subjectColorInput.value = "#4fd1c5";
    subjectGoalInput.value = "";
    deleteSubjectBtn.classList.add("hidden");
  }
  openModal(subjectModal, subjectNameInput);
}

deleteSubjectBtn.addEventListener("click", () => {
  const id = subjectEditIdInput.value;
  if (id && confirmDeleteSubject(id)) closeModals();
});

subjectNameInput.addEventListener("input", () => subjectNameInput.setCustomValidity(""));

// ---- Form submissions ----

sessionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const subjectId = sessionSubjectSelect.value;
  const duration = parseInt(sessionDurationInput.value, 10);
  const subj = subjectById(subjectId);
  if (!subj || !duration || duration < 1) return;

  const editId = sessionEditIdInput.value;
  if (editId) {
    updateSession(data, editId, { subjectId, duration, date: sessionDateInput.value });
    closeModals();
    render();
    showToast("Session updated.");
    return;
  }

  addSession(data, {
    id: crypto.randomUUID(),
    subjectId,
    duration,
    date: sessionDateInput.value,
    createdAt: Date.now()
  });
  saveSettings(data, { lastSubject: subjectId });
  closeModals();
  render();
  showToast(`Logged ${minutesToLabel(duration)} of ${subj.name}.`);
});

subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const editId = subjectEditIdInput.value;
  const name = subjectNameInput.value.trim();

  const duplicate = data.subjects.some(
    s => s.id !== editId && s.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    subjectNameInput.setCustomValidity("You already have a subject with this name.");
    subjectNameInput.reportValidity();
    return;
  }

  const weeklyGoal = Math.min(168, Math.max(0, parseFloat(subjectGoalInput.value) || 0));

  if (editId) {
    updateSubject(data, editId, { name, color: subjectColorInput.value, weeklyGoal });
    showToast("Subject updated.");
  } else {
    addSubject(data, {
      id: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      name,
      color: subjectColorInput.value,
      weeklyGoal
    });
    showToast(`Added "${name}".`);
  }

  closeModals();
  render();
});

// ---- Export ----

$("export-btn").addEventListener("click", () => {
  if (data.sessions.length === 0) {
    showToast("Nothing to export yet.");
    return;
  }
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [...data.sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => {
      const subj = subjectById(s.subjectId);
      return [s.date, q(subj ? subj.name : "Unknown"), s.duration].join(",");
    });
  const csv = ["Date,Subject,Minutes", ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-sessions-${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---- Backup and restore ----

$("backup-export-btn").addEventListener("click", () => {
  const blob = new Blob([buildBackup(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-tracker-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup saved to your downloads.");
});

$("backup-import-btn").addEventListener("click", () => backupFileInput.click());

backupFileInput.addEventListener("change", () => {
  const file = backupFileInput.files[0];
  backupFileInput.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const result = parseBackup(String(reader.result));
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    const { subjects, sessions } = result.data;
    const msg = `Restore this backup (${subjects.length} subjects, ${sessions.length} sessions)? It will replace your current data.`;
    if (!confirm(msg)) return;

    data = result.data;
    saveData(data);
    filterSubjectId = null;
    showAll = false;
    render();
    showToast("Backup restored.");
  };
  reader.onerror = () => showToast("Could not read that file.");
  reader.readAsText(file);
});

// ---- Pomodoro timer ----

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

let pomodoro = {
  secondsLeft: FOCUS_SECONDS,
  mode: "focus", // "focus" | "break"
  running: false,
  endAt: 0,
  intervalId: null,
  subjectId: null
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updatePomodoroDisplay() {
  const time = formatTime(pomodoro.secondsLeft);
  pomodoroTimeEl.textContent = time;
  pomodoroModeEl.textContent = pomodoro.mode === "focus" ? "Focus" : "Break";
  pomodoroStartBtn.textContent = pomodoro.running ? "Pause" : "Start";
  pomodoroBox.classList.toggle("on-break", pomodoro.mode === "break");
  pomodoroSkipBtn.classList.toggle("hidden", pomodoro.mode !== "break");
  pomodoroSubjectSelect.disabled = pomodoro.running && pomodoro.mode === "focus";
  document.title = pomodoro.running
    ? `${time} ${pomodoro.mode === "focus" ? "Focus" : "Break"} | Study Tracker`
    : "Study Tracker";
}

function startTimer() {
  pomodoro.endAt = Date.now() + pomodoro.secondsLeft * 1000;
  pomodoro.running = true;
  clearInterval(pomodoro.intervalId);
  pomodoro.intervalId = setInterval(tickPomodoro, 500);
}

function stopTimer() {
  clearInterval(pomodoro.intervalId);
  pomodoro.running = false;
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ac = new AudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.6);
  } catch (e) { /* sound is optional */ }
}

function tickPomodoro() {
  // Based on the clock, so it stays accurate even when the tab is in the background
  pomodoro.secondsLeft = Math.max(0, Math.round((pomodoro.endAt - Date.now()) / 1000));
  if (pomodoro.secondsLeft === 0) {
    completePomodoro();
  } else {
    updatePomodoroDisplay();
  }
}

function completePomodoro() {
  stopTimer();
  beep();

  if (pomodoro.mode === "focus") {
    const subjectId = subjectById(pomodoro.subjectId) ? pomodoro.subjectId : pomodoroSubjectSelect.value;
    if (subjectById(subjectId)) {
      addSession(data, {
        id: crypto.randomUUID(),
        subjectId,
        duration: FOCUS_SECONDS / 60,
        date: todayKey(),
        createdAt: Date.now()
      });
      render();
    }
    pomodoro.mode = "break";
    pomodoro.secondsLeft = BREAK_SECONDS;
    startTimer();
    showToast("Focus session logged. Enjoy a 5 minute break.");
  } else {
    pomodoro.mode = "focus";
    pomodoro.secondsLeft = FOCUS_SECONDS;
    pomodoro.subjectId = null;
    showToast("Break over. Start the next focus round when you are ready.");
  }
  updatePomodoroDisplay();
}

pomodoroStartBtn.addEventListener("click", () => {
  if (pomodoro.running) {
    pomodoro.secondsLeft = Math.max(1, Math.round((pomodoro.endAt - Date.now()) / 1000));
    stopTimer();
  } else {
    if (pomodoro.mode === "focus") {
      if (!subjectById(pomodoroSubjectSelect.value)) {
        showToast("Add a subject first so the timer knows what to log.");
        return;
      }
      if (!pomodoro.subjectId) pomodoro.subjectId = pomodoroSubjectSelect.value;
    }
    startTimer();
  }
  updatePomodoroDisplay();
});

pomodoroResetBtn.addEventListener("click", () => {
  stopTimer();
  pomodoro.mode = "focus";
  pomodoro.secondsLeft = FOCUS_SECONDS;
  pomodoro.subjectId = null;
  updatePomodoroDisplay();
});

pomodoroSkipBtn.addEventListener("click", () => {
  stopTimer();
  pomodoro.mode = "focus";
  pomodoro.secondsLeft = FOCUS_SECONDS;
  pomodoro.subjectId = null;
  updatePomodoroDisplay();
});

window.addEventListener("beforeunload", (e) => {
  if (pomodoro.running && pomodoro.mode === "focus") {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Refresh at midnight so "Today" and the streak stay correct
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) {
    lastDay = todayKey();
    render();
  }
}, 60000);

updatePomodoroDisplay();
render();
