// app.js — main application logic

let data = loadData();

const subjectListEl = document.getElementById("subject-list");
const sessionTbody = document.getElementById("session-tbody");
const emptyState = document.getElementById("empty-state");
const streakCountEl = document.getElementById("streak-count");

const statTodayEl = document.getElementById("stat-today");
const statWeekEl = document.getElementById("stat-week");
const statTotalEl = document.getElementById("stat-total");
const statSessionsEl = document.getElementById("stat-sessions");

const sessionModal = document.getElementById("session-modal");
const sessionForm = document.getElementById("session-form");
const sessionSubjectSelect = document.getElementById("session-subject");
const sessionDurationInput = document.getElementById("session-duration");
const sessionDateInput = document.getElementById("session-date");

const subjectModal = document.getElementById("subject-modal");
const subjectForm = document.getElementById("subject-form");
const subjectModalTitle = document.getElementById("subject-modal-title");
const subjectEditIdInput = document.getElementById("subject-edit-id");
const subjectNameInput = document.getElementById("subject-name");
const subjectColorInput = document.getElementById("subject-color");
const deleteSubjectBtn = document.getElementById("delete-subject-btn");

const pomodoroSubjectSelect = document.getElementById("pomodoro-subject");
const pomodoroTimeEl = document.getElementById("pomodoro-time");
const pomodoroModeEl = document.getElementById("pomodoro-mode");
const pomodoroStartBtn = document.getElementById("pomodoro-start");
const pomodoroResetBtn = document.getElementById("pomodoro-reset");

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

let pomodoro = {
  secondsLeft: FOCUS_SECONDS,
  mode: "focus", // "focus" | "break"
  running: false,
  intervalId: null
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function minutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function subjectById(id) {
  return data.subjects.find(s => s.id === id);
}

function render() {
  renderSubjectList();
  renderStats();
  renderSessionTable();
  renderSubjectChart(document.getElementById("subject-chart"), data.subjects, data.sessions);
  renderHeatmap(document.getElementById("heatmap"), data.sessions);
  populateSubjectSelect();
}

function renderSubjectList() {
  subjectListEl.innerHTML = "";
  data.subjects.forEach(subj => {
    const totalMins = data.sessions
      .filter(s => s.subjectId === subj.id)
      .reduce((sum, s) => sum + s.duration, 0);

    const li = document.createElement("li");
    li.innerHTML = `
      <span class="subject-dot" style="background:${subj.color}"></span>
      <span class="subject-name">${subj.name}</span>
      <span class="subject-hours">${(totalMins / 60).toFixed(1)}h</span>
      <span class="subject-actions">
        <button class="icon-btn edit-subject-btn" data-id="${subj.id}" title="Edit">✎</button>
        <button class="icon-btn delete-subject-list-btn" data-id="${subj.id}" title="Delete">✕</button>
      </span>
    `;
    subjectListEl.appendChild(li);
  });

  subjectListEl.querySelectorAll(".edit-subject-btn").forEach(btn => {
    btn.addEventListener("click", () => openSubjectModal(btn.dataset.id));
  });
  subjectListEl.querySelectorAll(".delete-subject-list-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Delete this subject? Its logged sessions will be removed too.")) {
        deleteSubject(data, btn.dataset.id);
        render();
      }
    });
  });
}

function renderStats() {
  const today = todayKey();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const todayMins = data.sessions
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);

  const weekMins = data.sessions
    .filter(s => new Date(s.date) >= weekAgo)
    .reduce((sum, s) => sum + s.duration, 0);

  const totalMins = data.sessions.reduce((sum, s) => sum + s.duration, 0);

  statTodayEl.textContent = minutesToLabel(todayMins);
  statWeekEl.textContent = minutesToLabel(weekMins);
  statTotalEl.textContent = minutesToLabel(totalMins);
  statSessionsEl.textContent = data.sessions.length;

  streakCountEl.textContent = calculateStreak();
}

function calculateStreak() {
  const studiedDates = new Set(data.sessions.map(s => s.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // if nothing logged today yet, still allow streak to count from yesterday
  if (!studiedDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (studiedDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderSessionTable() {
  sessionTbody.innerHTML = "";
  const sorted = [...data.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 10);

  emptyState.classList.toggle("hidden", recent.length > 0);

  recent.forEach(session => {
    const subj = subjectById(session.subjectId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="subject-dot" style="background:${subj ? subj.color : "#666"}; display:inline-block; margin-right:8px;"></span>${subj ? subj.name : "Unknown"}</td>
      <td>${minutesToLabel(session.duration)}</td>
      <td>${session.date}</td>
      <td><button class="delete-btn" data-id="${session.id}">Delete</button></td>
    `;
    sessionTbody.appendChild(tr);
  });

  sessionTbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteSession(data, btn.dataset.id);
      render();
    });
  });
}

function populateSubjectSelect() {
  sessionSubjectSelect.innerHTML = "";
  pomodoroSubjectSelect.innerHTML = "";
  data.subjects.forEach(subj => {
    const opt = document.createElement("option");
    opt.value = subj.id;
    opt.textContent = subj.name;
    sessionSubjectSelect.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    pomodoroSubjectSelect.appendChild(opt2);
  });
}

// Modal open/close
document.getElementById("log-session-btn").addEventListener("click", () => {
  sessionDateInput.value = todayKey();
  sessionModal.classList.remove("hidden");
});
document.getElementById("cancel-session").addEventListener("click", () => {
  sessionModal.classList.add("hidden");
});

document.getElementById("add-subject-btn").addEventListener("click", () => {
  openSubjectModal(null);
});
document.getElementById("cancel-subject").addEventListener("click", () => {
  subjectModal.classList.add("hidden");
});

function openSubjectModal(subjectId) {
  if (subjectId) {
    const subj = subjectById(subjectId);
    subjectModalTitle.textContent = "Edit subject";
    subjectEditIdInput.value = subj.id;
    subjectNameInput.value = subj.name;
    subjectColorInput.value = subj.color;
    deleteSubjectBtn.classList.remove("hidden");
  } else {
    subjectModalTitle.textContent = "Add a subject";
    subjectEditIdInput.value = "";
    subjectForm.reset();
    subjectColorInput.value = "#4fd1c5";
    deleteSubjectBtn.classList.add("hidden");
  }
  subjectModal.classList.remove("hidden");
}

deleteSubjectBtn.addEventListener("click", () => {
  const id = subjectEditIdInput.value;
  if (id && confirm("Delete this subject? Its logged sessions will be removed too.")) {
    deleteSubject(data, id);
    subjectModal.classList.add("hidden");
    render();
  }
});

// Form submissions
sessionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const session = {
    id: crypto.randomUUID(),
    subjectId: sessionSubjectSelect.value,
    duration: parseInt(sessionDurationInput.value, 10),
    date: sessionDateInput.value
  };
  addSession(data, session);
  sessionForm.reset();
  sessionModal.classList.add("hidden");
  render();
});

subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const editId = subjectEditIdInput.value;

  if (editId) {
    updateSubject(data, editId, {
      name: subjectNameInput.value,
      color: subjectColorInput.value
    });
  } else {
    const subject = {
      id: subjectNameInput.value.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      name: subjectNameInput.value,
      color: subjectColorInput.value
    };
    addSubject(data, subject);
  }

  subjectForm.reset();
  subjectModal.classList.add("hidden");
  render();
});

// ---- Pomodoro timer ----

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updatePomodoroDisplay() {
  pomodoroTimeEl.textContent = formatTime(pomodoro.secondsLeft);
  pomodoroModeEl.textContent = pomodoro.mode === "focus" ? "Focus" : "Break";
  pomodoroStartBtn.textContent = pomodoro.running ? "Pause" : "Start";
}

function tickPomodoro() {
  pomodoro.secondsLeft--;

  if (pomodoro.secondsLeft <= 0) {
    if (pomodoro.mode === "focus") {
      // log the completed focus session automatically
      const session = {
        id: crypto.randomUUID(),
        subjectId: pomodoroSubjectSelect.value,
        duration: FOCUS_SECONDS / 60,
        date: todayKey()
      };
      addSession(data, session);
      render();

      pomodoro.mode = "break";
      pomodoro.secondsLeft = BREAK_SECONDS;
    } else {
      pomodoro.mode = "focus";
      pomodoro.secondsLeft = FOCUS_SECONDS;
    }
  }

  updatePomodoroDisplay();
}

pomodoroStartBtn.addEventListener("click", () => {
  if (pomodoro.running) {
    clearInterval(pomodoro.intervalId);
    pomodoro.running = false;
  } else {
    pomodoro.intervalId = setInterval(tickPomodoro, 1000);
    pomodoro.running = true;
  }
  updatePomodoroDisplay();
});

pomodoroResetBtn.addEventListener("click", () => {
  clearInterval(pomodoro.intervalId);
  pomodoro.running = false;
  pomodoro.mode = "focus";
  pomodoro.secondsLeft = FOCUS_SECONDS;
  updatePomodoroDisplay();
});

updatePomodoroDisplay();

window.addEventListener("resize", () => {
  renderSubjectChart(document.getElementById("subject-chart"), data.subjects, data.sessions);
});

render();
