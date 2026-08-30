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

function liveSecondsFromRuntime(data) {
  if (!data || typeof data !== 'object') return 0;
  const base = Math.max(0, Number(data.baseSeconds ?? data.seconds) || 0);
  if (!data.running) return Math.max(base, Math.max(0, Number(data.seconds) || 0));
  const started = Number(data.runStartedAt) || 0;
  if (!started) return base;
  return base + Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function runtimeHasActiveSession(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.pendingCommit && Number(data.pendingCommit.secs) > 0) return true;
  return (
    !!data.running ||
    liveSecondsFromRuntime(data) > 0 ||
    !!String(data.dayStart || '').trim()
  );
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

let _lastPauseLabel = '';
let _lastStopLabel = '';
let _lastExpandLabel = '';

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
  if (!data || typeof data !== 'object') return false;

  const runtimeActive = runtimeHasActiveSession(data);
  const hadSession = state.running || liveSeconds() > 0 || state.stopLocked;

  if (!runtimeActive) {
    state.stopLocked = false;
    state.awaitingPauseConfirm = false;
    state.localHoldUntil = 0;
  } else if (state.stopLocked) {
    return false;
  }

  if (runtimeActive && Date.now() < state.localHoldUntil) return false;
  if (state.awaitingPauseConfirm && data.running === true) return false;
  if (
    runtimeActive &&
    !state.running &&
    liveSeconds() > 0 &&
    data.running === true &&
    state.awaitingPauseConfirm
  ) {
    return false;
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

  return !runtimeActive && hadSession;
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

let allowMiniClose = false;
let allowAppExit = false;
let closeDialogOpen = false;

async function sessionCloseChoiceDialog() {
  try {
    return await invoke('tracker_session_close_dialog', {
      title: tr('activeSessionCloseTitle'),
      saveClose: tr('activeSessionCloseSaveClose'),
      savePause: tr('activeSessionCloseSavePause'),
      dontSave: tr('activeSessionCloseDontSave')
    });
  } catch (_) {
    return null;
  }
}

function runtimeIsRunning(data) {
  if (!data || typeof data !== 'object') return false;
  return !!data.running;
}

async function pauseSessionFromMini() {
  if (state.running) {
    state.awaitingPauseConfirm = true;
    const secs = freezeLocal();
    render();
    await invoke('tracker_notify_mini_action', {
      action: 'pause',
      seconds: secs,
      actionAt: Date.now()
    });
    return;
  }
  const secs = liveSeconds();
  if (secs > 0) {
    await invoke('tracker_notify_mini_action', {
      action: 'pause',
      seconds: secs,
      actionAt: Date.now()
    });
  }
}

async function stopSessionFromMini() {
  const secs = liveSeconds();
  freezeLocal();
  state.running = false;
  await invoke('tracker_notify_mini_action', {
    action: 'stop',
    seconds: secs,
    actionAt: Date.now()
  });
}

async function quitApp() {
  allowAppExit = true;
  allowMiniClose = true;
  try {
    await invoke('allow_app_exit');
  } catch (_) {
    /* ignore */
  }
}

async function handleCloseRequest() {
  if (allowAppExit) {
    await quitApp();
    return;
  }
  if (closeDialogOpen) return;
  closeDialogOpen = true;
  try {
    let runtime = null;
    try {
      runtime = await invoke('tracker_get_timer_state');
      applyStudioState(runtime);
    } catch (_) {
      /* ignore */
    }

    const running = runtimeIsRunning(runtime) || (state.running && !state.stopLocked);

    if (running) {
      const choice = await sessionCloseChoiceDialog();
      if (!choice) return;
      if (choice === 'save_close') {
        await stopSessionFromMini();
      } else if (choice === 'save_pause') {
        await pauseSessionFromMini();
      } else if (choice === 'discard') {
        await discardOpenTimer();
      }
      await quitApp();
      return;
    }

    await pauseSessionFromMini();
    await quitApp();
  } finally {
    closeDialogOpen = false;
  }
}

async function discardOpenTimer() {
  try {
    await invoke('tracker_discard_open_timer');
  } catch (_) {
    /* ignore */
  }
}

async function requestCloseMini() {
  await handleCloseRequest();
}

async function handleAppExitRequested() {
  await handleCloseRequest();
}

async function bindAppExitGuard() {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== 'function') return;
  try {
    await listen('app-exit-requested', () => {
      void handleAppExitRequested();
    });
  } catch (_) {
    /* ignore */
  }
}

function bindCloseGuard() {
  document.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void handleCloseRequest();
    },
    true
  );

  try {
    const getWin = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
    if (typeof getWin !== 'function') return;
    const win = getWin();
    if (!win?.onCloseRequested) return;
    void win.onCloseRequested(event => {
      if (allowMiniClose) return;
      event.preventDefault();
      void handleCloseRequest();
    });
  } catch (_) {
    /* ignore */
  }
}

async function handleCloseMiniButton() {
  let runtime = null;
  try {
    runtime = await invoke('tracker_get_timer_state');
    applyStudioState(runtime);
  } catch (_) {
    /* ignore */
  }

  const running = runtimeIsRunning(runtime) || (state.running && !state.stopLocked);
  if (!running) {
    await closeMiniWindow();
    return;
  }

  if (closeDialogOpen) return;
  closeDialogOpen = true;
  try {
    const choice = await sessionCloseChoiceDialog();
    if (!choice) return;
    if (choice === 'save_close') {
      await stopSessionFromMini();
    } else if (choice === 'save_pause') {
      await pauseSessionFromMini();
    } else if (choice === 'discard') {
      await discardOpenTimer();
    }
    await closeMiniWindow();
  } finally {
    closeDialogOpen = false;
  }
}

async function closeMiniWindow() {
  try {
    const getWin = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
    if (typeof getWin === 'function') {
      const win = getWin();
      if (win?.hide) {
        await win.hide();
        return;
      }
    }
  } catch (_) {
    /* fall through to Rust hide */
  }
  try {
    await invoke('close_tracker_mini');
  } catch (_) {
    /* ignore */
  }
}

function maybeCloseAfterExternalStop(sessionEnded) {
  if (sessionEnded && !closeDialogOpen) void closeMiniWindow();
}

function render() {
  const projectEl = $('project');
  const clientEl = $('client');
  const statusEl = $('status');
  const timeEl = $('time');
  const secs = liveSeconds();
  if (projectEl) projectEl.textContent = state.project || tr('miniNoProject');
  if (clientEl) clientEl.textContent = state.client || '—';
  if (timeEl) timeEl.textContent = formatHms(secs);
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
  const btnPause = $('btnPause');
  const btnStop = $('btnStop');
  const expand = $('btnExpand');
  const pauseLabel = state.running ? tr('pause') : tr('resume');
  const stopLabel = tr('stop');
  const expandLabel = tr('miniOpenMain');
  if (btnPause && _lastPauseLabel !== pauseLabel) {
    btnPause.textContent = pauseLabel;
    _lastPauseLabel = pauseLabel;
  }
  if (btnStop && _lastStopLabel !== stopLabel) {
    btnStop.textContent = stopLabel;
    _lastStopLabel = stopLabel;
  }
  if (expand && _lastExpandLabel !== expandLabel) {
    expand.textContent = expandLabel;
    _lastExpandLabel = expandLabel;
  }
  if (btnPause) btnPause.disabled = state.stopLocked;
  if (btnStop) btnStop.disabled = state.stopLocked;
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
    const data = event?.payload ?? event;
    const sessionEnded = applyStudioState(data);
    render();
    maybeCloseAfterExternalStop(sessionEnded);
  });
}

async function syncFromRuntime() {
  try {
    const data = await invoke('tracker_get_timer_state');
    const sessionEnded = applyStudioState(data);
    render();
    maybeCloseAfterExternalStop(sessionEnded);
  } catch (_) {
    /* ignore */
  }
}

function bindControls() {
  const onButtonPointerDown = e => {
    e.stopPropagation();
  };

  $('btnPause')?.addEventListener('pointerdown', onButtonPointerDown);
  $('btnStop')?.addEventListener('pointerdown', onButtonPointerDown);
  $('btnExpand')?.addEventListener('pointerdown', onButtonPointerDown);

  $('btnPause')?.addEventListener('click', e => {
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

  $('btnStop')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (state.stopLocked) return;
    state.stopLocked = true;
    state.awaitingPauseConfirm = false;
    state.localHoldUntil = Date.now() + 8000;
    const secs = freezeLocal();
    render();
    notifyStudio('stop', secs);
    void closeMiniWindow();
  });

  $('btnExpand')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    void invoke('open_tracker_studio').catch(err => {
      alert(String(err?.message || err));
    });
  });

  $('btnCloseMini')?.addEventListener('pointerdown', onButtonPointerDown);
  $('btnCloseMini')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    void handleCloseMiniButton();
  });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void syncFromRuntime();
});

window.setInterval(() => {
  void syncFromRuntime();
}, 800);

void (async () => {
  await window.MusomoI18n?.initLocale?.();
  const closeBtn = $('btnCloseMini');
  if (closeBtn) closeBtn.textContent = tr('closeMiniTimerLink');
  bindControls();
  bindStudioEvents();
  bindCloseGuard();
  void bindAppExitGuard();
  await syncFromRuntime();
  render();
  startPoll();
})();
