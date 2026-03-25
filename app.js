// ===========================
// TASKFLOW — APP LOGIC
// ===========================

const STORAGE_KEY = 'taskflow_tasks';
const USER_KEY = 'taskflow_user';
const THEME_KEY = 'taskflow_theme';

let tasks = [];
let currentUser = null;
let activeFilter = 'all';
let reminderTimers = [];

// ===========================
// INIT
// ===========================
function init() {
  loadTheme();
  const savedUser = loadUser();
  if (savedUser) {
    currentUser = savedUser;
    showApp();
  } else {
    showAuth();
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☽' : '☀';
}

function loadUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
function saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

// ===========================
// AUTH
// ===========================
function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  setupUserBadge();
  tasks = loadTasks();
  renderTasks();
  scheduleAllReminders();
}

function setupUserBadge() {
  if (!currentUser) return;
  const name = currentUser.name || 'User';
  document.getElementById('user-name-display').textContent = name;
  document.getElementById('user-avatar').textContent = name[0].toUpperCase();
}

// Demo login
document.getElementById('demo-login-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('demo-name');
  const name = nameInput.value.trim();
  if (!name) { nameInput.style.borderColor = 'var(--critical)'; return; }
  nameInput.style.borderColor = '';
  currentUser = { name, provider: 'demo', id: 'demo_' + Date.now() };
  saveUser(currentUser);
  showApp();
  showToast(`Welcome, ${name}! 🚀`);
});

// Google auth simulation (redirects to Google OAuth in production)
document.getElementById('google-login-btn').addEventListener('click', () => {
  // In production this would use actual Google OAuth
  // For GitHub Pages demo, simulate a Google login prompt
  const name = prompt('Google Sign-In (Demo)\nEnter your name:');
  if (name && name.trim()) {
    currentUser = { name: name.trim(), provider: 'google', id: 'google_' + Date.now() };
    saveUser(currentUser);
    showApp();
    showToast(`Signed in as ${name.trim()} ✓`);
  }
});

// Enter key on demo input
document.getElementById('demo-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('demo-login-btn').click();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  if (!confirm('Log out of TaskFlow?')) return;
  localStorage.removeItem(USER_KEY);
  currentUser = null;
  reminderTimers.forEach(clearTimeout);
  reminderTimers = [];
  showAuth();
  showToast('Logged out. See you soon! 👋');
});

// ===========================
// THEME TOGGLE
// ===========================
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  showToast(next === 'dark' ? 'Dark mode on ☽' : 'Light mode on ☀');
});

// ===========================
// TASK CREATION
// ===========================
const taskInput = document.getElementById('task-input');
const charCount = document.getElementById('char-count');

taskInput.addEventListener('input', () => {
  const len = taskInput.value.length;
  charCount.textContent = `${len} / 200`;
  charCount.classList.toggle('warn', len > 150);
  charCount.classList.toggle('danger', len > 180);
});

document.getElementById('add-btn').addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
});

function addTask() {
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.style.borderColor = 'var(--critical)';
    setTimeout(() => taskInput.style.borderColor = '', 1500);
    taskInput.focus();
    return;
  }

  const dueTime = document.getElementById('task-time').value;
  const reminder = document.getElementById('reminder-select').value;
  const priority = document.getElementById('priority-select').value;

  const task = {
    id: Date.now().toString(),
    title,
    dueTime: dueTime || null,
    reminder: reminder || null,
    priority,
    done: false,
    createdAt: new Date().toISOString(),
    doneAt: null,
  };

  tasks.unshift(task);
  saveTasks();
  renderTasks();
  scheduleReminder(task);

  // Reset inputs
  taskInput.value = '';
  document.getElementById('task-time').value = '';
  document.getElementById('reminder-select').value = '';
  document.getElementById('priority-select').value = 'normal';
  charCount.textContent = '0 / 200';
  charCount.classList.remove('warn', 'danger');

  showToast('Task added ◈');
  taskInput.focus();
}

// ===========================
// TASK RENDERING
// ===========================
function getFilteredTasks() {
  switch (activeFilter) {
    case 'pending': return tasks.filter(t => !t.done);
    case 'done': return tasks.filter(t => t.done);
    case 'critical': return tasks.filter(t => t.priority === 'critical');
    default: return tasks;
  }
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const filtered = getFilteredTasks();
  const emptyState = document.getElementById('empty-state');

  // Update stats
  const pending = tasks.filter(t => !t.done).length;
  const done = tasks.filter(t => t.done).length;
  document.getElementById('pending-count').textContent = pending;
  document.getElementById('done-count').textContent = done;

  // Remove existing task cards (keep empty state)
  list.querySelectorAll('.task-card').forEach(c => c.remove());

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(task => {
    const card = buildTaskCard(task);
    list.appendChild(card);
  });
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card${task.done ? ' done' : ''}${task.priority !== 'normal' ? ` priority-${task.priority}` : ''}`;
  card.dataset.id = task.id;

  // Check button
  const check = document.createElement('div');
  check.className = 'task-check';
  check.title = task.done ? 'Mark as pending' : 'Mark as done';
  check.innerHTML = task.done ? '✓' : '';
  check.addEventListener('click', () => toggleDone(task.id));

  // Body
  const body = document.createElement('div');
  body.className = 'task-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  if (task.dueTime) {
    const tag = document.createElement('span');
    tag.className = 'task-tag tag-time';
    tag.textContent = `⏰ ${formatDateTime(task.dueTime)}`;
    meta.appendChild(tag);
  }

  if (task.reminder) {
    const tag = document.createElement('span');
    tag.className = 'task-tag tag-reminder';
    tag.textContent = `🔔 ${formatReminder(task.reminder)}`;
    meta.appendChild(tag);
  }

  if (task.priority === 'high') {
    const tag = document.createElement('span');
    tag.className = 'task-tag tag-priority-high';
    tag.textContent = '⚡ HIGH';
    meta.appendChild(tag);
  }
  if (task.priority === 'critical') {
    const tag = document.createElement('span');
    tag.className = 'task-tag tag-priority-critical';
    tag.textContent = '🔴 CRITICAL';
    meta.appendChild(tag);
  }

  if (task.done && task.doneAt) {
    const tag = document.createElement('span');
    tag.className = 'task-tag tag-done';
    tag.textContent = `✓ Completed ${formatDateTime(task.doneAt)}`;
    meta.appendChild(tag);
  }

  body.appendChild(titleEl);
  if (meta.children.length > 0) body.appendChild(meta);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  if (!task.done) {
    const doneBtn = document.createElement('button');
    doneBtn.className = 'task-action-btn done-btn';
    doneBtn.title = 'Mark as done';
    doneBtn.textContent = '✓';
    doneBtn.addEventListener('click', () => toggleDone(task.id));
    actions.appendChild(doneBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'task-action-btn';
  delBtn.title = 'Delete task';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => deleteTask(task.id));
  actions.appendChild(delBtn);

  card.appendChild(check);
  card.appendChild(body);
  card.appendChild(actions);

  return card;
}

function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  saveTasks();
  renderTasks();
  showToast(task.done ? `✓ Task completed! ${formatTime(task.doneAt)}` : 'Task moved back to pending');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  showToast('Task removed');
}

// ===========================
// FILTERS
// ===========================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderTasks();
  });
});

// ===========================
// REMINDERS
// ===========================
function scheduleAllReminders() {
  reminderTimers.forEach(clearTimeout);
  reminderTimers = [];
  tasks.filter(t => !t.done && t.dueTime && t.reminder).forEach(scheduleReminder);
}

function scheduleReminder(task) {
  if (!task.dueTime || !task.reminder || task.done) return;

  const dueMs = new Date(task.dueTime).getTime();
  const reminderMs = dueMs - (parseInt(task.reminder) * 60 * 1000);
  const now = Date.now();
  const delay = reminderMs - now;

  if (delay <= 0) return; // already past

  const timer = setTimeout(() => {
    showReminderOverlay(task);
    triggerBrowserNotification(task);
  }, delay);

  reminderTimers.push(timer);
}

function showReminderOverlay(task) {
  document.getElementById('reminder-title').textContent = '⚡ Task Reminder';
  document.getElementById('reminder-body').textContent =
    `"${task.title}" is due ${formatDateTime(task.dueTime)}`;
  document.getElementById('reminder-overlay').classList.remove('hidden');
}

document.getElementById('reminder-dismiss').addEventListener('click', () => {
  document.getElementById('reminder-overlay').classList.add('hidden');
});

function triggerBrowserNotification(task) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('TaskFlow Reminder ◈', {
      body: `"${task.title}" is due soon!`,
      icon: 'https://raw.githubusercontent.com/primer/octicons/main/icons/tasklist-24.svg',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') triggerBrowserNotification(task);
    });
  }
}

// Request notification permission when app loads
if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => Notification.requestPermission(), 2000);
}

// ===========================
// HELPERS
// ===========================
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatReminder(mins) {
  const m = parseInt(mins);
  if (m < 60) return `${m}m before`;
  if (m === 60) return '1h before';
  if (m === 1440) return '1d before';
  return `${m}m before`;
}

// ===========================
// TOAST
// ===========================
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

// ===========================
// START
// ===========================
init();
