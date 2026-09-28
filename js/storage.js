// storage.js — handles all localStorage read/write for the study tracker

const STORAGE_KEY = "study-tracker-data";

const DEFAULT_SUBJECTS = [
  { id: "web-dev", name: "Dynamic Web App Dev", color: "#4fd1c5" },
  { id: "iot", name: "IoT Application Dev", color: "#f0a868" },
  { id: "c-prog", name: "Programming with C", color: "#8b8bf0" },
  { id: "sys-net", name: "System & Network Admin", color: "#e0685c" },
  { id: "data-story", name: "Storytelling with Data", color: "#6adfd4" },
  { id: "env", name: "Environmental Studies", color: "#a3d977" }
];

const DEFAULT_SETTINGS = { dailyGoal: 120, lastSubject: "" };

// Local date as YYYY-MM-DD (toISOString uses UTC and gives the wrong day in India early morning)
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

function defaultData() {
  return {
    subjects: DEFAULT_SUBJECTS.map(s => ({ ...s })),
    sessions: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn("localStorage unavailable, data will not persist.", e);
  }

  if (!raw) {
    const initial = defaultData();
    saveData(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
    };
  } catch {
    const fallback = defaultData();
    saveData(fallback);
    return fallback;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save data.", e);
  }
}

function saveSettings(data, updates) {
  data.settings = { ...data.settings, ...updates };
  saveData(data);
}

function addSubject(data, subject) {
  data.subjects.push(subject);
  saveData(data);
}

function updateSubject(data, id, updates) {
  const subj = data.subjects.find(s => s.id === id);
  if (subj) {
    subj.name = updates.name;
    subj.color = updates.color;
    saveData(data);
  }
}

function deleteSubject(data, id) {
  data.subjects = data.subjects.filter(s => s.id !== id);
  data.sessions = data.sessions.filter(s => s.subjectId !== id);
  saveData(data);
}

function addSession(data, session) {
  data.sessions.push(session);
  saveData(data);
}

function deleteSession(data, sessionId) {
  data.sessions = data.sessions.filter(s => s.id !== sessionId);
  saveData(data);
}
