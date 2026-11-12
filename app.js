const STORAGE_KEY = 'interval_timer_settings_v1';

const DEFAULT_SETTINGS = {
  preSeconds: 3,
  mainHours: 0,
  mainMinutes: 0,
  mainSeconds: 5,
  mode: 'single', // 'single' | 'loop'
  theme: 'system' // 'system' | 'light' | 'dark'
};

// State
let settings = loadSettings();
let state = 'idle'; // 'idle' | 'pre' | 'main'
let phaseEndTime = 0;
let lastPreWholeSecond = null;
let rafId = null;
let wakeLock = null;

// DOM Elements
const rootEl = document.documentElement;
const phaseBadge = document.getElementById('phase-badge');
const displayWrapper = document.getElementById('display-wrapper');
const timerDisplay = document.getElementById('timer-display');
const loopIndicator = document.getElementById('loop-indicator');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

const settingsDialog = document.getElementById('settings-dialog');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsForm = document.getElementById('settings-form');

const preSecondsInput = document.getElementById('pre-seconds');
const mainHoursInput = document.getElementById('main-hours');
const mainMinutesInput = document.getElementById('main-minutes');
const mainSecondsInput = document.getElementById('main-seconds');
const themeSelect = document.getElementById('theme-select');

// Initialize
applyTheme(settings.theme);
syncFormWithSettings();
updateLayoutClasses();
renderIdleDisplay();

// Persistence
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(newSettings) {
  settings = newSettings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not persist settings to localStorage:', err);
  }
}

// Layout Class Toggle (checks if minutes or hours are active)
function updateLayoutClasses() {
  const hasMinutesOrHours = settings.mainHours > 0 || settings.mainMinutes > 0;
  displayWrapper.classList.toggle('has-minutes-or-hours', hasMinutesOrHours);
}

// Theme Handling
function applyTheme(theme) {
  if (theme === 'system') {
    rootEl.removeAttribute('data-theme');
  } else {
    rootEl.setAttribute('data-theme', theme);
  }
}

// Duration Helpers
function getMainDurationMs() {
  const totalSeconds =
    (settings.mainHours * 3600) +
    (settings.mainMinutes * 60) +
    settings.mainSeconds;
  return Math.max(0, totalSeconds * 1000);
}

function getPreDurationMs() {
  return Math.max(0, settings.preSeconds * 1000);
}

// Color Gradient Interpolation (Red -> Yellow -> Green) for Pre-Timer
function interpolateRgb(c1, c2, factor) {
  const r = Math.round(c1[0] + factor * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + factor * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + factor * (c2[2] - c1[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

function getPreTimerColor(progress) {
  const red = [239, 68, 68];
  const yellow = [234, 179, 8];
  const green = [34, 197, 94];

  if (progress <= 0.5) {
    return interpolateRgb(red, yellow, progress * 2);
  } else {
    return interpolateRgb(yellow, green, (progress - 0.5) * 2);
  }
}

function formatMainTime(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clamped % 1000) / 10);

  const pad2 = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    const tenths = Math.floor(centiseconds / 10);
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}.${tenths}`;
  }

  if (minutes > 0) {
    return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
  }

  return `${pad2(seconds)}.${pad2(centiseconds)}`;
}

// Screen Wake Lock
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // Ignore
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch {
      // Ignore
    }
  }
}

function triggerSwellAnimation() {
  timerDisplay.classList.remove('swell-tick');
  void timerDisplay.offsetWidth;
  timerDisplay.classList.add('swell-tick');
}

// Timer Lifecycle
function startTimer() {
  const preMs = getPreDurationMs();
  const mainMs = getMainDurationMs();

  if (preMs === 0 && mainMs === 0) return;

  startBtn.hidden = true;
  stopBtn.hidden = false;
  openSettingsBtn.disabled = true;
  requestWakeLock();

  if (preMs > 0) {
    enterPrePhase(preMs);
  } else {
    enterMainPhase(mainMs);
  }

  rafId = requestAnimationFrame(tick);
}

function enterPrePhase(durationMs) {
  state = 'pre';
  phaseEndTime = performance.now() + durationMs;
  lastPreWholeSecond = null;
  displayWrapper.dataset.phase = 'pre';
  phaseBadge.textContent = 'Get Ready';
}

function enterMainPhase(durationMs) {
  state = 'main';
  phaseEndTime = performance.now() + durationMs;
  lastPreWholeSecond = null;
  timerDisplay.style.color = '';
  timerDisplay.classList.remove('swell-tick');
  displayWrapper.dataset.phase = 'main';
  phaseBadge.textContent = settings.mode === 'loop' ? 'Running (Loop)' : 'Running';
}

function stopTimer() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  state = 'idle';
  lastPreWholeSecond = null;
  timerDisplay.style.color = '';
  timerDisplay.classList.remove('swell-tick');
  releaseWakeLock();

  startBtn.hidden = false;
  stopBtn.hidden = true;
  openSettingsBtn.disabled = false;
  renderIdleDisplay();
}

function renderIdleDisplay() {
  displayWrapper.dataset.phase = 'idle';
  phaseBadge.textContent = 'Ready';
  loopIndicator.hidden = settings.mode !== 'loop';
  timerDisplay.style.color = '';
  timerDisplay.textContent = formatMainTime(getMainDurationMs());
}

function tick(now) {
  const remaining = phaseEndTime - now;

  if (state === 'pre') {
    const totalPreMs = getPreDurationMs();
    const elapsed = totalPreMs - remaining;
    const progress = Math.max(0, Math.min(1, elapsed / totalPreMs));
    timerDisplay.style.color = getPreTimerColor(progress);

    if (remaining <= 0) {
      const mainMs = getMainDurationMs();
      if (mainMs > 0) {
        enterMainPhase(mainMs);
        timerDisplay.textContent = formatMainTime(mainMs);
      } else {
        handleCycleComplete();
        return;
      }
    } else {
      const wholeSeconds = Math.ceil(remaining / 1000);
      if (wholeSeconds !== lastPreWholeSecond) {
        lastPreWholeSecond = wholeSeconds;
        timerDisplay.textContent = String(wholeSeconds);
        triggerSwellAnimation();
      }
    }
  } else if (state === 'main') {
    if (remaining <= 0) {
      timerDisplay.textContent = formatMainTime(0);
      handleCycleComplete();
      return;
    } else {
      timerDisplay.textContent = formatMainTime(remaining);
    }
  }

  rafId = requestAnimationFrame(tick);
}

function handleCycleComplete() {
  if (settings.mode === 'loop') {
    const preMs = getPreDurationMs();
    const mainMs = getMainDurationMs();
    if (preMs > 0) {
      enterPrePhase(preMs);
    } else {
      enterMainPhase(mainMs);
    }
    rafId = requestAnimationFrame(tick);
  } else {
    stopTimer();
  }
}

// Settings UI Handlers
function syncFormWithSettings() {
  preSecondsInput.value = settings.preSeconds;
  mainHoursInput.value = settings.mainHours;
  mainMinutesInput.value = settings.mainMinutes;
  mainSecondsInput.value = settings.mainSeconds;
  themeSelect.value = settings.theme;

  const modeRadio = settingsForm.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeRadio) modeRadio.checked = true;
}

openSettingsBtn.addEventListener('click', () => {
  syncFormWithSettings();
  settingsDialog.showModal();
});

closeSettingsBtn.addEventListener('click', () => {
  settingsDialog.close();
});

settingsDialog.addEventListener('click', (e) => {
  if (e.target === settingsDialog) {
    settingsDialog.close();
  }
});

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

settingsForm.addEventListener('submit', () => {
  const formData = new FormData(settingsForm);
  const updated = {
    preSeconds: Math.max(0, parseInt(formData.get('preSeconds'), 10) || 0),
    mainHours: Math.max(0, parseInt(formData.get('mainHours'), 10) || 0),
    mainMinutes: Math.max(0, Math.min(59, parseInt(formData.get('mainMinutes'), 10) || 0)),
    mainSeconds: Math.max(0, Math.min(59, parseInt(formData.get('mainSeconds'), 10) || 0)),
    mode: formData.get('mode') === 'loop' ? 'loop' : 'single',
    theme: ['system', 'light', 'dark'].includes(formData.get('theme')) ? formData.get('theme') : 'system'
  };

  saveSettings(updated);
  applyTheme(updated.theme);
  updateLayoutClasses();
  renderIdleDisplay();
});

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
