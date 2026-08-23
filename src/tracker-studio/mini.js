/**
 * Compact always-on-top timer.
 * Rust runtime store is source of truth — survives Studio close/reopen.
 */

function $(id) {
  return document.getElementById(id);
}

function tr(key) {
  return window.MusomoI18n?.t?.(key) ?? key;
}

function invoke(cmd, args = {}) {
  const core = window.__TAURI__?.core;
  if (!core?.invoke) return Promise.reject(new Error('Tauri not available'));
  return core.invoke(cmd, args);
}

function formatHms(total) {
  const s = Math.max(0, Math.floor(total));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const state = {
  running: false,
  seconds: 0,
  baseSeconds: 0,
  runStartedAt: null,
  project: '',
  client: '',
  projectId: '',
  pollId: null,
  /** Ignore stale Studio echoes briefly after local Pause/Resume/Stop. */
  localHoldUntil: 0,
  /** Reject stale "running" echoes until Rust confirms pause. */
  awaitingPauseConfirm: false,
  stopLocked: false
};

function liveSeconds() {
  const base = Math.max(0, Math.floor(state.baseSeconds || 0));
  if (!state.running || !state.runStartedAt) {
    return Math.max(base, Math.floor(state.seconds || 0));
  }
  return base + Math.max(0, Math.floor((Date.now() - state.runStartedAt) / 1000));
}

function statusLabel() {
  const secs = liveSeconds();
  if (state.stopLocked) return tr('stopped');
  if (state.running) return tr('running');
  if (secs > 0) return tr('paused');
  return tr('stopped');
}

function applyStudioState(data) {
  if (!data || typeof data !== 'object') return;
  if (state.stopLocked) return;
  if (Date.now() < state.localHoldUntil) return;
  // Never overwrite a local pause with a stale "running" echo from Studio tick.
  if (state.awaitingPauseConfirm && data.running === true) return;
  if (!state.running && liveSeconds() > 0 && data.running === true && state.awaitingPauseConfirm) {
    return;
  }

  if (typeof data.running === 'boolean') {
    state.running = data.running;
    if (!data.running) state.awaitingPauseConfirm = false;
  }
  if (typeof data.baseSeconds === 'number') {
    state.baseSeconds = Math.max(0, Math.floor(data.baseSeconds));
  } else if (typeof data.seconds === 'number' && !data.running) {
    state.baseSeconds = Math.max(0, Math.floor(data.seconds));
  }
  if (data.runStartedAt) state.runStartedAt = Number(data.runStartedAt) || null;
  else state.runStartedAt = null;
  if (typeof data.seconds === 'number') state.seconds = Math.max(0, Math.floor(data.seconds));
  if (data.project != null) state.project = data.project;
  if (data.client != null) state.client = data.client;
  if (data.projectId != null) state.projectId = data.projectId;
}

function notifyStudio(action, seconds) {
  const actionAt = Date.now();
  void invoke('tracker_notify_mini_action', {
    action,
    seconds: Math.floor(seconds),
    actionAt
  }).catch(() => {
    /* Studio may be closed — Rust store still updated */
  });
}

function freezeLocal() {
  const secs = liveSeconds();
  state.running = false;
  state.baseSeconds = secs;
  state.seconds = secs;
  state.runStartedAt = null;
  return secs;
}

function closeMiniWindow() {
  try {
    const getWin = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
    if (typeof getWin === 'function') {
      const win = getWin();
      if (win?.close) {
        void win.close();
        return;
      }
    }
  } catch (_) {
    /* fall through */
  }
  void invoke('close_tracker_mini').catch(() => {});
}

function render() {
  const projectEl = $('project');
  const clientEl = $('client');
  const statusEl = $('status');
  const secs = liveSeconds();
  if (projectEl) projectEl.textContent = state.project || tr('miniNoProject');
  if (clientEl) clientEl.textContent = state.client || '—';
  $('time').textContent = formatHms(secs);
  if (statusEl) {
    statusEl.textContent = statusLabel();
    statusEl.dataset.state = state.stopLocked
      ? 'stopped'
      : state.running
        ? 'running'
        : secs > 0
          ? 'paused'
          : 'stopped';
  }
  $('btnPause').textContent = state.running ? tr('pause') : tr('resume');
  $('btnStop').textContent = tr('stop');
  const expand = $('btnExpand');
  if (expand) expand.textContent = tr('miniOpenMain');
  $('btnPause').disabled = state.stopLocked;
  $('btnStop').disabled = state.stopLocked;
}

function startPoll() {
  if (state.pollId) return;
  state.pollId = window.setInterval(() => {
    render();
  }, 250);
}

function bindStudioEvents() {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== 'function') return;
  void listen('tracker-timer-state', event => {
    applyStudioState(event?.payload ?? event);
    render();
  });
}

async function syncFromRuntime() {
  try {
    const data = await invoke('tracker_get_timer_state');
    applyStudioState(data);
    render();
  } catch (_) {
    /* ignore */
  }
}

$('btnPause').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  if (state.stopLocked) return;
  state.localHoldUntil = Date.now() + 2500;
  if (state.running) {
    state.awaitingPauseConfirm = true;
    const secs = freezeLocal();
    render();
    notifyStudio('pause', secs);
  } else {
    state.awaitingPauseConfirm = false;
    state.running = true;
    state.runStartedAt = Date.now();
    state.baseSeconds = Math.max(0, Math.floor(state.baseSeconds || state.seconds || 0));
    render();
    notifyStudio('resume', liveSeconds());
  }
});

$('btnStop').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  if (state.stopLocked) return;
  state.stopLocked = true;
  state.awaitingPauseConfirm = false;
  state.localHoldUntil = Date.now() + 8000;
  const secs = freezeLocal();
  render();
  notifyStudio('stop', secs);
  closeMiniWindow();
});

$('btnExpand').addEventListener('click', () => {
  void invoke('open_tracker_studio').catch(err => {
    alert(String(err?.message || err));
  });
});

/** Soft hover focus only — never on pointerdown (that ate clicks). */
let _lastFocusAt = 0;
function focusMiniWindow() {
  const now = Date.now();
  if (now - _lastFocusAt < 400) return;
  _lastFocusAt = now;
  try {
    const getWin = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
    if (typeof getWin !== 'function') return;
    const win = getWin();
    if (win?.setFocus) void win.setFocus();
  } catch (_) {
    /* ignore */
  }
}

document.documentElement.addEventListener('mouseenter', () => {
  focusMiniWindow();
});

bindStudioEvents();
render();
startPoll();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void syncFromRuntime();
});

window.setInterval(() => {
  void syncFromRuntime();
}, 800);

void (async () => {
  await window.MusomoI18n?.initLocale?.();
  await syncFromRuntime();
  render();
})();
