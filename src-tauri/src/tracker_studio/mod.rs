//! Musomo Tracker — standalone module (cloned from Visual Search Tracker Studio).

mod db;
mod types;

use types::{
    TrackerArchiveEntry, TrackerClient, TrackerModuleSettings, TrackerProject, TrackerSession,
    TrackerSnapshot, TrackerTask,
};

/// Primary app window (configured in tauri.conf.json).
const MAIN_LABEL: &str = "main";
const MINI_LABEL: &str = "tracker-mini";
const MINI_DEFAULT_W: f64 = 320.0;
const MINI_DEFAULT_H: f64 = 248.0;
const MINI_COMPACT_W: f64 = 260.0;
const MINI_COMPACT_H: f64 = 200.0;

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
        window.hide().map_err(|e| e.to_string())?;
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
pub fn tracker_list_archives() -> Result<Vec<TrackerArchiveEntry>, String> {
    db::list_archives()
}

#[tauri::command]
pub fn tracker_create_backup(label: String) -> Result<String, String> {
    db::create_named_backup(label)
}

#[tauri::command]
pub fn tracker_delete_archive(name: String) -> Result<(), String> {
    db::delete_archive(name)
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

fn set_mini_default_size(window: &tauri::WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(MINI_DEFAULT_W, MINI_DEFAULT_H));
}

fn set_mini_compact_size(window: &tauri::WebviewWindow) {
    let _ = window.set_size(tauri::LogicalSize::new(MINI_COMPACT_W, MINI_COMPACT_H));
}

fn attach_mini_window_handlers(window: &tauri::WebviewWindow) {
    use std::sync::{Arc, Mutex};
    use tauri::{Emitter, WindowEvent};

    #[derive(Clone, Copy, PartialEq, Eq)]
    enum MiniSizeMode {
        Default,
        Compact,
    }

    let mode = Arc::new(Mutex::new(MiniSizeMode::Default));
    let window_for_events = window.clone();

    window.on_window_event(move |event| {
        match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window_for_events.emit("mini-close-requested", ());
            }
            WindowEvent::Focused(focused) => {
                if !*focused {
                    let w = window_for_events.clone();
                    let mode_flag = mode.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(90));
                        if w.is_minimized().unwrap_or(false) {
                            let _ = w.unminimize();
                            set_mini_compact_size(&w);
                            if let Ok(mut current) = mode_flag.lock() {
                                *current = MiniSizeMode::Compact;
                            }
                        }
                    });
                    return;
                }

                if window_for_events.is_minimized().unwrap_or(false) {
                    let _ = window_for_events.unminimize();
                    set_mini_compact_size(&window_for_events);
                    if let Ok(mut current) = mode.lock() {
                        *current = MiniSizeMode::Compact;
                    }
                }
            }
            WindowEvent::Resized(size) => {
                if window_for_events.is_minimized().unwrap_or(false) {
                    return;
                }

                let scale = window_for_events.scale_factor().unwrap_or(1.0);
                let width = size.width as f64 / scale;
                let height = size.height as f64 / scale;
                let current = mode.lock().ok().map(|m| *m);

                if current == Some(MiniSizeMode::Compact)
                    && (width >= MINI_DEFAULT_W - 8.0 || height >= MINI_DEFAULT_H - 8.0)
                {
                    set_mini_default_size(&window_for_events);
                    if let Ok(mut m) = mode.lock() {
                        *m = MiniSizeMode::Default;
                    }
                    return;
                }

                if width > MINI_DEFAULT_W + 8.0 || height > MINI_DEFAULT_H + 8.0 {
                    set_mini_default_size(&window_for_events);
                    if let Ok(mut m) = mode.lock() {
                        *m = MiniSizeMode::Default;
                    }
                } else if width <= MINI_COMPACT_W + 8.0 && height <= MINI_COMPACT_H + 8.0 {
                    if let Ok(mut m) = mode.lock() {
                        *m = MiniSizeMode::Compact;
                    }
                }
            }
            _ => {}
        }
    });
}

fn open_tracker_mini_window(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    if let Some(window) = app.get_webview_window(MINI_LABEL) {
        set_mini_default_size(&window);
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
        }
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        let _ = window.set_always_on_top(true);
        minimize_main_window(app);
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        MINI_LABEL,
        WebviewUrl::App("tracker-studio/mini.html".into()),
    )
    .title("Musomo Tracker")
    .inner_size(MINI_DEFAULT_W, MINI_DEFAULT_H)
    .min_inner_size(MINI_COMPACT_W, MINI_COMPACT_H)
    .resizable(true)
    .maximizable(false)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    attach_mini_window_handlers(&window);
    minimize_main_window(app);
    Ok(())
}
