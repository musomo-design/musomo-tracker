//! Musomo Tracker — standalone Tauri shell (extracted from Visual Search Tracker Studio).

mod app_menu;
mod locale;
mod tracker_studio;

use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

fn normalize_path(path: String) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    #[cfg(target_os = "windows")]
    let path_buf = PathBuf::from(trimmed.replace('/', "\\"));
    #[cfg(not(target_os = "windows"))]
    let path_buf = PathBuf::from(trimmed);

    if path_buf.exists() {
        return Ok(path_buf);
    }

    Err(format!("Path not found: {}", path_buf.display()))
}

#[cfg(target_os = "windows")]
fn open_path_with_default_app(path_buf: &Path) -> Result<(), String> {
    let path_string = path_buf.to_string_lossy().replace('\'', "''");
    let script = format!("Invoke-Item -LiteralPath '{}'", path_string);

    Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script.as_str(),
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn downloads_dir() -> Result<PathBuf, String> {
    if let Ok(home) = std::env::var("HOME") {
        let path = PathBuf::from(home).join("Downloads");
        if path.is_dir() {
            return Ok(path);
        }
    }

    if let Ok(profile) = std::env::var("USERPROFILE") {
        let path = PathBuf::from(profile).join("Downloads");
        if path.is_dir() {
            return Ok(path);
        }
    }

    Err("Downloads folder not found.".to_string())
}

fn sanitize_download_file_name(file_name: &str) -> Result<String, String> {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return Err("Missing output file name.".to_string());
    }

    let path = Path::new(trimmed);
    if path.components().count() != 1 {
        return Err("Only a file name is allowed.".to_string());
    }

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid output file name.".to_string())?;

    if name.contains("..") {
        return Err("Invalid output file name.".to_string());
    }

    Ok(name.to_string())
}

fn uniquify_download_path(candidate: PathBuf) -> PathBuf {
    if !candidate.exists() {
        return candidate;
    }

    let parent = candidate
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(PathBuf::new);
    let file_name = candidate
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download")
        .to_string();
    let path = Path::new(&file_name);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("download");
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|ext| format!(".{}", ext))
        .unwrap_or_default();

    let mut counter = 2;
    loop {
        let next = parent.join(format!("{} ({}){}", stem, counter, extension));
        if !next.exists() {
            return next;
        }
        counter += 1;
    }
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let path_buf = normalize_path(path)?;
    std::fs::read(&path_buf).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_downloaded_file(file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("The export was empty.".to_string());
    }

    let safe_name = sanitize_download_file_name(&file_name)?;
    let mut target = downloads_dir()?.join(&safe_name);
    target = uniquify_download_path(target);
    std::fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

fn applescript_string_literal(value: &str) -> String {
    format!(
        "\"{}\"",
        value
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\r', "")
            .replace('\n', " ")
    )
}

fn applescript_multiline_literal(value: &str) -> String {
    let parts: Vec<String> = value
        .replace('\r', "")
        .lines()
        .map(applescript_string_literal)
        .collect();
    if parts.is_empty() {
        return "\"\"".to_string();
    }
    parts.join(" & return & ")
}

#[tauri::command]
fn compose_mail_with_attachment(
    to: String,
    subject: String,
    body: String,
    attachment_path: String,
) -> Result<(), String> {
    let to = to.trim().to_string();
    if to.is_empty() || !to.contains('@') {
        return Err("Missing or invalid recipient email.".to_string());
    }
    let path = normalize_path(attachment_path)?;
    if !path.is_file() {
        return Err(format!("Attachment not found: {}", path.display()));
    }

    #[cfg(target_os = "macos")]
    {
        let path_str = path.to_string_lossy().replace('\\', "/");
        let script = format!(
            r#"tell application "Mail"
  set newMessage to make new outgoing message with properties {{subject:{subject}, content:({body}) & return & return, visible:true}}
  tell newMessage
    make new to recipient at end of to recipients with properties {{address:{to}}}
    try
      make new attachment with properties {{file name:POSIX file {path}}} at after the last paragraph
    end try
  end tell
  activate
end tell"#,
            subject = applescript_string_literal(&subject),
            body = applescript_multiline_literal(&body),
            to = applescript_string_literal(&to),
            path = applescript_string_literal(&path_str),
        );
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Could not open Mail: {}", err.trim()));
        }
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (subject, body, path);
        Err("Send report with attachment is currently supported on macOS Mail.".to_string())
    }
}

fn is_allowed_external_url(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Missing URL.".to_string());
    }
    if !is_allowed_external_url(trimmed) {
        return Err("Only http and https URLs are allowed.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    let path_buf = normalize_path(path)?;

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path_buf.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        open_path_with_default_app(&path_buf)?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path_buf.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

use std::sync::atomic::{AtomicBool, Ordering};

pub struct AppExitGuard(pub AtomicBool);

#[tauri::command]
fn allow_app_exit(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<AppExitGuard>()
        .0
        .store(true, Ordering::SeqCst);
    app.exit(0);
    Ok(())
}

#[tauri::command]
async fn tracker_confirm_dialog(
    app: tauri::AppHandle,
    message: String,
    title: String,
) -> Result<bool, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    tauri::async_runtime::spawn_blocking(move || {
        let dialog_title = if title.trim().is_empty() {
            "Musomo Tracker".to_string()
        } else {
            title
        };
        app.dialog()
            .message(message)
            .title(dialog_title)
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::OkCancel)
            .blocking_show()
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn tracker_two_choice_dialog(
    app: tauri::AppHandle,
    title: String,
    message: String,
    primary: String,
    secondary: String,
) -> Result<bool, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    tauri::async_runtime::spawn_blocking(move || {
        let dialog_title = if title.trim().is_empty() {
            "Musomo Tracker".to_string()
        } else {
            title
        };
        app.dialog()
            .message(message)
            .title(dialog_title)
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(primary, secondary))
            .blocking_show()
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn tracker_session_close_dialog(
    app: tauri::AppHandle,
    title: String,
    save_close: String,
    save_pause: String,
    dont_save: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{
        DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult,
    };

    tauri::async_runtime::spawn_blocking(move || {
        let dialog_title = if title.trim().is_empty() {
            "Musomo Tracker".to_string()
        } else {
            title
        };
        let res = app
            .dialog()
            .message("")
            .title(dialog_title)
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::YesNoCancelCustom(
                save_close.clone(),
                save_pause.clone(),
                dont_save.clone(),
            ))
            .blocking_show_with_result();
        match res {
            MessageDialogResult::Custom(label) if label == save_close => {
                Some("save_close".to_string())
            }
            MessageDialogResult::Custom(label) if label == save_pause => {
                Some("save_pause".to_string())
            }
            MessageDialogResult::Custom(label) if label == dont_save => {
                Some("discard".to_string())
            }
            MessageDialogResult::Yes => Some("save_close".to_string()),
            MessageDialogResult::No => Some("save_pause".to_string()),
            MessageDialogResult::Cancel => Some("discard".to_string()),
            _ => None,
        }
    })
    .await
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(AppExitGuard(AtomicBool::new(false)));
            app.manage(tracker_studio::TimerRuntimeStore::new());
            #[cfg(desktop)]
            {
                use std::collections::HashMap;
                let menu = app_menu::build_app_menu(app.handle(), &HashMap::new())?;
                app.set_menu(menu)?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            use tauri::Emitter;
            let action = event.id().0.clone();
            let _ = app.emit_to("main", "menu-action", action);
        })
        .invoke_handler(tauri::generate_handler![
            locale::get_system_locale,
            app_menu::update_app_menu,
            tracker_studio::open_tracker_studio,
            tracker_studio::open_tracker_mini,
            tracker_studio::close_tracker_mini,
            tracker_studio::tracker_notify_mini_action,
            tracker_studio::tracker_push_timer_state,
            tracker_studio::tracker_get_timer_state,
            tracker_studio::tracker_clear_timer_pending_commit,
            tracker_studio::tracker_discard_open_timer,
            tracker_studio::tracker_init,
            tracker_studio::tracker_reset_database,
            tracker_studio::tracker_list_archives,
            tracker_studio::tracker_create_backup,
            tracker_studio::tracker_delete_archive,
            tracker_studio::tracker_restore_archive,
            tracker_studio::tracker_upsert_client,
            tracker_studio::tracker_delete_client,
            tracker_studio::tracker_upsert_project,
            tracker_studio::tracker_delete_project,
            tracker_studio::tracker_upsert_task,
            tracker_studio::tracker_upsert_session,
            tracker_studio::tracker_delete_session,
            tracker_studio::tracker_save_settings,
            tracker_studio::tracker_save_brand_image,
            tracker_studio::tracker_import_brand_file,
            save_downloaded_file,
            read_file_bytes,
            open_url,
            open_file,
            compose_mail_with_attachment,
            allow_app_exit,
            tracker_confirm_dialog,
            tracker_two_choice_dialog,
            tracker_session_close_dialog,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Musomo Tracker")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if app_handle
                    .state::<AppExitGuard>()
                    .0
                    .load(Ordering::SeqCst)
                {
                    return;
                }
                if tracker_studio::TimerRuntimeStore::has_active_open_timer(&app_handle) {
                    api.prevent_exit();
                    use tauri::{Emitter, Manager};
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("app-exit-requested", ());
                    } else if let Some(window) = app_handle.get_webview_window("tracker-mini") {
                        let _ = window.emit("app-exit-requested", ());
                    }
                }
            }
        });
}
