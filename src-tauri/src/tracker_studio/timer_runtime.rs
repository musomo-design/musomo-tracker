use super::db;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimerPendingCommit {
    pub secs: i64,
    pub date: String,
    pub start: String,
    pub break_sec: i64,
    pub project_id: String,
    pub project: String,
    pub client: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimerRuntimeState {
    pub running: bool,
    pub seconds: i64,
    pub base_seconds: i64,
    pub run_started_at: Option<i64>,
    pub project: String,
    pub client: String,
    pub project_id: String,
    pub day: String,
    pub day_start: String,
    pub pause_accum_sec: i64,
    pub pause_started_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pending_commit: Option<TimerPendingCommit>,
}

pub struct TimerRuntimeStore(pub Mutex<TimerRuntimeState>);

impl TimerRuntimeStore {
    pub fn new() -> Self {
        let loaded = Self::load_initial();
        Self(Mutex::new(loaded))
    }

    fn now_ms() -> i64 {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }

    fn persist(state: &TimerRuntimeState) {
        if let Ok(json) = serde_json::to_string(state) {
            let _ = db::save_open_timer_json(&json);
        }
    }

    fn load_initial() -> TimerRuntimeState {
        db::load_open_timer_json()
            .ok()
            .flatten()
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or_default()
    }

    fn live_seconds(state: &TimerRuntimeState) -> i64 {
        let base = state.base_seconds.max(0);
        if !state.running {
            return state.seconds.max(base);
        }
        let Some(started) = state.run_started_at else {
            return base;
        };
        let extra = (Self::now_ms() - started).max(0) / 1000;
        base + extra
    }

    fn to_payload(state: &TimerRuntimeState) -> TimerRuntimeState {
        let mut out = state.clone();
        out.seconds = Self::live_seconds(state);
        out
    }

    fn broadcast(app: &AppHandle, state: &TimerRuntimeState) {
        let payload = Self::to_payload(state);
        let _ = app.emit("tracker-timer-state", payload);
    }

    pub fn get(app: &AppHandle) -> TimerRuntimeState {
        let store = app.state::<TimerRuntimeStore>();
        let state = store.0.lock().expect("timer runtime lock");
        Self::to_payload(&state)
    }

    pub fn clear_pending_commit(app: &AppHandle) -> Result<(), String> {
        let store = app.state::<TimerRuntimeStore>();
        let mut state = store.0.lock().map_err(|e| e.to_string())?;
        state.pending_commit = None;
        Self::persist(&state);
        Ok(())
    }

    pub fn merge_from_studio(app: &AppHandle, value: Value) -> Result<(), String> {
        let store = app.state::<TimerRuntimeStore>();
        let mut state = store.0.lock().map_err(|e| e.to_string())?;
        if let Some(v) = value.get("running").and_then(|v| v.as_bool()) {
            state.running = v;
        }
        if let Some(v) = value.get("seconds").and_then(|v| v.as_i64()) {
            state.seconds = v;
        }
        if let Some(v) = value.get("baseSeconds").and_then(|v| v.as_i64()) {
            state.base_seconds = v;
        }
        if let Some(v) = value.get("runStartedAt") {
            state.run_started_at = v.as_i64();
        }
        if let Some(v) = value.get("project").and_then(|v| v.as_str()) {
            state.project = v.to_string();
        }
        if let Some(v) = value.get("client").and_then(|v| v.as_str()) {
            state.client = v.to_string();
        }
        if let Some(v) = value.get("projectId").and_then(|v| v.as_str()) {
            state.project_id = v.to_string();
        }
        if let Some(v) = value.get("day").and_then(|v| v.as_str()) {
            state.day = v.to_string();
        }
        if let Some(v) = value.get("dayStart").and_then(|v| v.as_str()) {
            state.day_start = v.to_string();
        }
        if let Some(v) = value.get("pauseAccumSec").and_then(|v| v.as_i64()) {
            state.pause_accum_sec = v;
        }
        if let Some(v) = value.get("pauseStartedAt") {
            state.pause_started_at = v.as_i64();
        }
        // Studio cleared the open timer after Stop — drop backup commit.
        if !state.running && state.base_seconds == 0 && state.day_start.is_empty() {
            state.pending_commit = None;
        }
        Self::persist(&state);
        Self::broadcast(app, &state);
        Ok(())
    }

    pub fn apply_mini_action(
        app: &AppHandle,
        action: &str,
        seconds: i64,
        action_at: i64,
    ) -> Result<(), String> {
        let store = app.state::<TimerRuntimeStore>();
        let mut state = store.0.lock().map_err(|e| e.to_string())?;
        let now = Self::now_ms();
        let secs = seconds.max(0);

        match action {
            "pause" => {
                state.running = false;
                state.base_seconds = secs;
                state.seconds = secs;
                state.run_started_at = None;
                state.pause_started_at = Some(now);
            }
            "resume" | "start" => {
                if let Some(ps) = state.pause_started_at {
                    state.pause_accum_sec += (now - ps).max(0) / 1000;
                }
                state.pause_started_at = None;
                state.base_seconds = secs;
                state.seconds = secs;
                state.running = true;
                state.run_started_at = Some(now);
            }
            "stop" => {
                if secs > 0 {
                    state.pending_commit = Some(TimerPendingCommit {
                        secs,
                        date: state.day.clone(),
                        start: state.day_start.clone(),
                        break_sec: state.pause_accum_sec,
                        project_id: state.project_id.clone(),
                        project: state.project.clone(),
                        client: state.client.clone(),
                    });
                }
                state.running = false;
                state.base_seconds = 0;
                state.seconds = 0;
                state.run_started_at = None;
                state.pause_started_at = None;
                state.pause_accum_sec = 0;
                state.day_start.clear();
            }
            _ => {}
        }

        Self::persist(&state);
        Self::broadcast(app, &state);

        let payload = serde_json::json!({
            "action": action,
            "seconds": secs,
            "actionAt": action_at,
        });
        app.emit("tracker-mini-action", payload)
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
