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
    subj.weeklyGoal = updates.weeklyGoal || 0;
    saveData(data);
  }
}

function updateSession(data, id, updates) {
  const session = data.sessions.find(s => s.id === id);
  if (session) {
    session.subjectId = updates.subjectId;
    session.duration = updates.duration;
    session.date = updates.date;
    saveData(data);
  }
}

// ---- Backup and restore ----

function buildBackup(data) {
  return JSON.stringify({
    app: "study-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    sessions: data.sessions,
    settings: data.settings
  }, null, 2);
}

// Validates a backup file and keeps only well-formed entries.
// Returns { ok: true, data } or { ok: false, error }.
function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  if (!raw || !Array.isArray(raw.subjects) || !Array.isArray(raw.sessions)) {
    return { ok: false, error: "This does not look like a Study Tracker backup." };
  }

  const subjects = raw.subjects
    .filter(s => s && typeof s.id === "string" && typeof s.name === "string" && s.name.trim())
    .map(s => ({
      id: s.id,
      name: s.name.trim().slice(0, 40),
      color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : "#4fd1c5",
      weeklyGoal: Number(s.weeklyGoal) > 0 && Number(s.weeklyGoal) <= 168 ? Number(s.weeklyGoal) : 0
    }));

  const ids = new Set(subjects.map(s => s.id));
  const sessions = raw.sessions
    .filter(s => s && typeof s.id === "string" && ids.has(s.subjectId)
      && Number.isInteger(s.duration) && s.duration >= 1 && s.duration <= 1440
      && typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date))
    .map(s => ({
      id: s.id,
      subjectId: s.subjectId,
      duration: s.duration,
      date: s.date,
      createdAt: Number(s.createdAt) || 0
    }));

  const goal = raw.settings && Number(raw.settings.dailyGoal);
  const settings = {
    ...DEFAULT_SETTINGS,
    dailyGoal: goal >= 15 && goal <= 1440 ? goal : DEFAULT_SETTINGS.dailyGoal,
    lastSubject: raw.settings && ids.has(raw.settings.lastSubject) ? raw.settings.lastSubject : ""
  };

  return { ok: true, data: { subjects, sessions, settings } };
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
