//! Musomo Tracker — standalone module (cloned from Visual Search Tracker Studio).

mod db;
mod types;

use types::{
    TrackerClient, TrackerModuleSettings, TrackerProject, TrackerSession, TrackerSnapshot,
    TrackerTask,
};

/// Primary app window (configured in tauri.conf.json).
const MAIN_LABEL: &str = "main";
const MINI_LABEL: &str = "tracker-mini";

mod timer_runtime;
pub use timer_runtime::{TimerRuntimeState, TimerRuntimeStore};

#[tauri::command]
pub fn tracker_notify_mini_action(
    app: tauri::AppHandle,
    action: String,
    seconds: i64,
    action_at: i64,
) -> Result<(), String> {
    TimerRuntimeStore::apply_mini_action(&app, &action, seconds, action_at)
}

#[tauri::command]
pub fn tracker_push_timer_state(
    app: tauri::AppHandle,
    state: serde_json::Value,
) -> Result<(), String> {
    TimerRuntimeStore::merge_from_studio(&app, state)
}

#[tauri::command]
pub fn tracker_get_timer_state(app: tauri::AppHandle) -> Result<TimerRuntimeState, String> {
    Ok(TimerRuntimeStore::get(&app))
}

#[tauri::command]
pub fn tracker_clear_timer_pending_commit(app: tauri::AppHandle) -> Result<(), String> {
    TimerRuntimeStore::clear_pending_commit(&app)
}

#[tauri::command]
pub fn open_tracker_studio(app: tauri::AppHandle) -> Result<(), String> {
    open_tracker_studio_window(&app)
}

#[tauri::command]
pub fn open_tracker_mini(app: tauri::AppHandle) -> Result<(), String> {
    open_tracker_mini_window(&app)
}

#[tauri::command]
pub fn close_tracker_mini(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window(MINI_LABEL) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn tracker_discard_open_timer(app: tauri::AppHandle) -> Result<(), String> {
    TimerRuntimeStore::discard_open_timer(&app)
}

#[tauri::command]
pub fn tracker_init() -> Result<TrackerSnapshot, String> {
    db::load_snapshot()
}

#[tauri::command]
pub fn tracker_reset_database(reseed: bool) -> Result<TrackerSnapshot, String> {
    db::reset_database(reseed)
}

#[tauri::command]
pub fn tracker_list_archives() -> Result<Vec<String>, String> {
    db::list_archives()
}

#[tauri::command]
pub fn tracker_restore_archive(name: String) -> Result<TrackerSnapshot, String> {
    db::restore_from_archive(name)
}

#[tauri::command]
pub fn tracker_upsert_client(client: TrackerClient) -> Result<TrackerClient, String> {
    db::upsert_client_record(client)
}

#[tauri::command]
pub fn tracker_upsert_project(project: TrackerProject) -> Result<TrackerProject, String> {
    db::upsert_project_record(project)
}

#[tauri::command]
pub fn tracker_delete_project(id: String) -> Result<(), String> {
    db::delete_project_record(id)
}

#[tauri::command]
pub fn tracker_delete_client(id: String) -> Result<(), String> {
    db::delete_client_record(id)
}

#[tauri::command]
pub fn tracker_upsert_task(task: TrackerTask) -> Result<TrackerTask, String> {
    db::upsert_task_record(task)
}

#[tauri::command]
pub fn tracker_upsert_session(session: TrackerSession) -> Result<TrackerSession, String> {
    db::upsert_session_record(session)
}

#[tauri::command]
pub fn tracker_delete_session(id: String) -> Result<(), String> {
    db::delete_session_record(id)
}

#[tauri::command]
pub fn tracker_save_settings(settings: TrackerModuleSettings) -> Result<TrackerModuleSettings, String> {
    db::save_settings_record(settings)
}

#[tauri::command]
pub fn tracker_save_brand_image(kind: String, data_url: String) -> Result<TrackerModuleSettings, String> {
    db::save_brand_image(kind, data_url)
}

#[tauri::command]
pub fn tracker_import_brand_file(kind: String, path: String) -> Result<TrackerModuleSettings, String> {
    db::import_brand_file(kind, path)
}

fn open_tracker_studio_window(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        window.show().map_err(|e| e.to_string())?;
        window.unminimize().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        MAIN_LABEL,
        WebviewUrl::App("tracker-studio/index.html".into()),
    )
    .title("Musomo Tracker")
    .inner_size(1440.0, 920.0)
    .min_inner_size(1100.0, 720.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn minimize_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        let _ = window.minimize();
    }
}

fn open_tracker_mini_window(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    if let Some(window) = app.get_webview_window(MINI_LABEL) {
        window.show().map_err(|e| e.to_string())?;
        window.unminimize().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        let _ = window.set_always_on_top(true);
        minimize_main_window(app);
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        MINI_LABEL,
        WebviewUrl::App("tracker-studio/mini.html".into()),
    )
    .title("Musomo Tracker")
    .inner_size(320.0, 210.0)
    .min_inner_size(280.0, 180.0)
    .resizable(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    minimize_main_window(app);
    Ok(())
}
