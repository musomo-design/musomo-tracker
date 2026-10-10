use super::capture_region::{self, pick_capture_region, CaptureRegion};
use super::db;
use super::types::{
    CaptureMonitorInfo, CaptureWorkScreenshotRequest, TrackerWorkScreenshot, WorkScreenshotFilter,
};
use base64::{engine::general_purpose, Engine as _};
use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, GenericImageView, ImageFormat};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;

const WEBP_QUALITY: f32 = 82.0;
const JPEG_QUALITY: u8 = 85;
const THUMB_MAX_EDGE: u32 = 720;
const THUMB_REGEN_BELOW: u32 = 480;
const THUMB_WEBP_QUALITY: f32 = 80.0;
const MAX_IMAGE_EDGE: u32 = 16_000;

pub fn capture_work_screenshot(
    app: &AppHandle,
    req: CaptureWorkScreenshotRequest,
) -> Result<TrackerWorkScreenshot, String> {
    if req.project_id.trim().is_empty() {
        return Err("Select a project before capturing a screenshot.".into());
    }

    let mode = req.capture_mode.trim().to_lowercase();
    let monitor_index = req.monitor_index;
    let area_region = if mode == "area" {
        pick_capture_region(app, monitor_index)?
    } else {
        None
    };

    let _capture_guard = prepare_capture_windows(app);
    std::thread::sleep(std::time::Duration::from_millis(if mode == "window" { 420 } else { 220 }));

    let captured_at = now_ms_string();
    let id = format!("ws{captured_at}");
    let file_name = build_file_name(&req.date, &captured_at, &req.session_id, &id);
    let thumb_name = build_thumb_name(&file_name);
    let dir = db::screenshots_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join(&file_name);
    let thumb_dest = dir.join(&thumb_name);
    let temp_png = dir.join(format!("tmp_{id}.png"));

    match mode.as_str() {
        "window" => {
            capture_window_png(&temp_png)?;
            convert_png_to_webp_file(&temp_png, &dest, WEBP_QUALITY)?;
            generate_thumbnail(&dest, &thumb_dest)?;
            let _ = std::fs::remove_file(&temp_png);
        }
        "area" => {
            let region =
                area_region.ok_or_else(|| "Capture area selection was cancelled.".to_string())?;
            capture_area_region_png(&temp_png, monitor_index, &region)?;
            convert_png_to_webp_file(&temp_png, &dest, WEBP_QUALITY)?;
            generate_thumbnail(&dest, &thumb_dest)?;
            let _ = std::fs::remove_file(&temp_png);
        }
        _ => {
            capture_monitor_png(&temp_png, monitor_index)?;
            convert_png_to_webp_file(&temp_png, &dest, WEBP_QUALITY)?;
            generate_thumbnail(&dest, &thumb_dest)?;
            let _ = std::fs::remove_file(&temp_png);
        }
    }

    if !dest.exists() {
        return Err("Screen capture produced no image.".into());
    }

    let description = if req.description.trim().is_empty() {
        default_description(&req.project, &captured_at)
    } else {
        req.description.trim().to_string()
    };

    let row = TrackerWorkScreenshot {
        id: id.clone(),
        session_id: req.session_id,
        open_session_key: req.open_session_key,
        project_id: req.project_id,
        project: req.project,
        client: req.client,
        date: req.date,
        captured_at: captured_at.clone(),
        file_path: dest.to_string_lossy().into_owned(),
        thumb_path: thumb_dest.to_string_lossy().into_owned(),
        description,
        note: String::new(),
        sort_order: 0,
    };
    db::insert_work_screenshot(&row)?;
    Ok(row)
}

pub fn import_work_screenshots(
    paths: Vec<String>,
    req: CaptureWorkScreenshotRequest,
) -> Result<Vec<TrackerWorkScreenshot>, String> {
    if req.project_id.trim().is_empty() {
        return Err("Select a project before importing screenshots.".into());
    }
    if paths.is_empty() {
        return Err("No files selected.".into());
    }

    let mut imported = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    for (index, path) in paths.into_iter().enumerate() {
        match import_work_screenshot_file(&path, &req, index) {
            Ok(row) => imported.push(row),
            Err(err) => errors.push(format!("{}: {err}", PathBuf::from(&path).display())),
        }
    }
    if imported.is_empty() {
        return Err(if errors.is_empty() {
            "No screenshots imported.".into()
        } else {
            errors.join("\n")
        });
    }
    Ok(imported)
}

fn import_work_screenshot_file(
    path: &str,
    req: &CaptureWorkScreenshotRequest,
    index: usize,
) -> Result<TrackerWorkScreenshot, String> {
    let source = PathBuf::from(path.trim());
    if !source.is_file() {
        return Err("File not found.".into());
    }
    let img = load_image_any(&source)?;
    let (w, h) = img.dimensions();
    if w > MAX_IMAGE_EDGE || h > MAX_IMAGE_EDGE {
        return Err(format!("Image too large ({w}×{h}). Maximum edge is {MAX_IMAGE_EDGE}px."));
    }

    let captured_at = now_ms_string();
    let id = format!("ws{captured_at}_{index}");
    let file_name = build_file_name(&req.date, &captured_at, &req.session_id, &id);
    let thumb_name = build_thumb_name(&file_name);
    let dir = db::screenshots_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join(&file_name);
    let thumb_dest = dir.join(&thumb_name);
    save_webp(&img, &dest, WEBP_QUALITY)?;
    generate_thumbnail(&dest, &thumb_dest)?;

    let description = if req.description.trim().is_empty() {
        default_description(&req.project, &captured_at)
    } else {
        req.description.trim().to_string()
    };

    let row = TrackerWorkScreenshot {
        id,
        session_id: req.session_id.clone(),
        open_session_key: req.open_session_key.clone(),
        project_id: req.project_id.clone(),
        project: req.project.clone(),
        client: req.client.clone(),
        date: req.date.clone(),
        captured_at,
        file_path: dest.to_string_lossy().into_owned(),
        thumb_path: thumb_dest.to_string_lossy().into_owned(),
        description,
        note: String::new(),
        sort_order: 0,
    };
    db::insert_work_screenshot(&row)?;
    Ok(row)
}

pub fn list_capture_monitors() -> Result<Vec<CaptureMonitorInfo>, String> {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        ensure_screen_capture_access()?;
        use xcap::Monitor;
        let monitors = Monitor::all().map_err(|e| format!("Screen capture failed: {e}"))?;
        return Ok(monitors
            .into_iter()
            .enumerate()
            .map(|(index, monitor)| CaptureMonitorInfo {
                index: index as u32,
                name: monitor.name().unwrap_or_else(|_| format!("Display {}", index + 1)),
                width: monitor.width().unwrap_or(0) as u32,
                height: monitor.height().unwrap_or(0) as u32,
            })
            .collect());
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Screen capture is not supported on this platform.".into())
    }
}

pub fn list_work_screenshots(filter: WorkScreenshotFilter) -> Result<Vec<TrackerWorkScreenshot>, String> {
    db::list_work_screenshots(filter)
}

pub fn update_work_screenshot_note(id: String, note: String) -> Result<TrackerWorkScreenshot, String> {
    db::update_work_screenshot_fields(&id, None, Some(note.trim()))
}

pub fn update_work_screenshot_fields(
    id: String,
    description: Option<String>,
    note: Option<String>,
) -> Result<TrackerWorkScreenshot, String> {
    db::update_work_screenshot_fields(
        &id,
        description.as_deref(),
        note.as_deref(),
    )
}

pub fn delete_work_screenshot(id: String) -> Result<(), String> {
    db::delete_work_screenshot(&id)
}

pub fn link_work_screenshots(open_session_key: String, session_id: String) -> Result<u32, String> {
    if open_session_key.trim().is_empty() || session_id.trim().is_empty() {
        return Ok(0);
    }
    db::link_work_screenshots(&open_session_key, &session_id)
}

pub fn link_session_screenshot_orphans(session_id: String, legacy_key: String) -> Result<u32, String> {
    db::link_session_screenshot_orphans(&session_id, &legacy_key)
}

pub fn screenshot_counts_for_sessions(
    session_ids: Vec<String>,
) -> Result<std::collections::HashMap<String, u32>, String> {
    db::screenshot_counts_for_sessions(&session_ids)
}

pub fn read_screenshot_jpeg_base64(path: String) -> Result<String, String> {
    let bytes = encode_screenshot_as_jpeg(Path::new(&path))?;
    Ok(format!(
        "data:image/jpeg;base64,{}",
        general_purpose::STANDARD.encode(bytes)
    ))
}

pub fn read_screenshot_image_data_url(path: String) -> Result<String, String> {
    read_image_file_data_url(Path::new(path.trim()))
}

pub fn read_screenshot_thumb_data_url(file_path: String, thumb_path: String) -> Result<String, String> {
    let master = PathBuf::from(file_path.trim());
    if !master.is_file() {
        return Err(format!("Screenshot file not found: {}", master.display()));
    }
    let thumb = PathBuf::from(thumb_path.trim());
    if thumb.is_file() && !thumb_is_stale(&thumb) {
        return read_image_file_data_url(&thumb);
    }
    let thumb_name = build_thumb_name(
        master
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("shot.webp"),
    );
    let thumb_dest = master
        .parent()
        .unwrap_or(Path::new(""))
        .join(&thumb_name);
    if generate_thumbnail(&master, &thumb_dest).is_ok() {
        let _ = db::update_work_screenshot_thumb_by_file_name(
            master
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(""),
            &thumb_name,
        );
        return read_image_file_data_url(&thumb_dest);
    }
    read_image_file_data_url(&master)
}

pub fn submit_capture_region(region: CaptureRegion) -> Result<(), String> {
    capture_region::submit_capture_region(region)
}

pub fn cancel_capture_region() -> Result<(), String> {
    capture_region::cancel_capture_region()
}

struct WindowRestoreState {
    label: String,
    was_minimized: bool,
}

fn prepare_capture_windows(app: &AppHandle) -> CaptureWindowGuard {
    let mut restore_states = Vec::new();
    for label in ["tracker-mini", "main", "capture-overlay"] {
        if let Some(window) = app.get_webview_window(label) {
            if !window.is_visible().unwrap_or(false) {
                continue;
            }
            let minimized = window.is_minimized().unwrap_or(false);
            // Minimized main stays in the Dock and must not be unminimized after capture.
            if label == "main" && minimized {
                continue;
            }
            restore_states.push(WindowRestoreState {
                label: label.to_string(),
                was_minimized: minimized,
            });
            let _ = window.hide();
        }
    }
    CaptureWindowGuard {
        app: app.clone(),
        restore_states,
    }
}

struct CaptureWindowGuard {
    app: AppHandle,
    restore_states: Vec<WindowRestoreState>,
}

impl Drop for CaptureWindowGuard {
    fn drop(&mut self) {
        for state in &self.restore_states {
            if let Some(window) = self.app.get_webview_window(&state.label) {
                if state.was_minimized {
                    let _ = window.minimize();
                } else {
                    let _ = window.show();
                    let _ = window.unminimize();
                }
            }
        }
    }
}

fn build_file_name(date: &str, captured_at_ms: &str, session_id: &str, id: &str) -> String {
    let date_part = date.replace('-', "");
    let date_part = if date_part.is_empty() {
        "nodate".to_string()
    } else {
        date_part
    };
    let time_part = ms_to_hhmmss(captured_at_ms);
    let session_part = if session_id.trim().is_empty() {
        "open".to_string()
    } else {
        session_id
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
            .take(10)
            .collect::<String>()
    };
    format!("{date_part}_{time_part}_{session_part}_{id}.webp")
}

fn ms_to_hhmmss(ms: &str) -> String {
    let Ok(value) = ms.parse::<i64>() else {
        return "000000".into();
    };
    let secs = (value / 1000) % 86_400;
    let h = secs / 3600;
    let m = (secs % 3600) / 60;
    let s = secs % 60;
    format!("{h:02}{m:02}{s:02}")
}

fn default_description(project: &str, _captured_at_ms: &str) -> String {
    project.trim().to_string()
}

fn ms_to_display_time(ms: &str) -> String {
    let Ok(value) = ms.parse::<i64>() else {
        return "--:--".into();
    };
    let secs = (value / 1000) % 86_400;
    format!("{:02}:{:02}", secs / 3600, (secs % 3600) / 60)
}

fn build_thumb_name(file_name: &str) -> String {
    let stem = file_name.strip_suffix(".webp").unwrap_or(file_name);
    format!("{stem}_thumb.webp")
}

fn generate_thumbnail(master: &Path, thumb_dest: &Path) -> Result<(), String> {
    let img = load_image_any(master)?;
    let (w, h) = img.dimensions();
    let max_edge = w.max(h);
    let thumb = if max_edge <= THUMB_MAX_EDGE {
        img
    } else {
        let scale = THUMB_MAX_EDGE as f32 / max_edge as f32;
        img.resize(
            ((w as f32 * scale).round() as u32).max(1),
            ((h as f32 * scale).round() as u32).max(1),
            image::imageops::FilterType::Lanczos3,
        )
    };
    save_webp(&thumb, thumb_dest, THUMB_WEBP_QUALITY)
}

fn thumb_is_stale(thumb: &Path) -> bool {
    let Ok(img) = load_image_any(thumb) else {
        return true;
    };
    let (w, h) = img.dimensions();
    w.max(h) < THUMB_REGEN_BELOW
}

fn read_image_file_data_url(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path)
        .map_err(|e| format!("Screenshot file not found ({}): {e}", path.display()))?;
    let mime = mime_for_image_path(path, &bytes);
    Ok(format!(
        "data:{mime};base64,{}",
        general_purpose::STANDARD.encode(bytes)
    ))
}

fn mime_for_image_path(path: &Path, bytes: &[u8]) -> &'static str {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        match ext.to_lowercase().as_str() {
            "webp" => return "image/webp",
            "jpg" | "jpeg" => return "image/jpeg",
            "png" => return "image/png",
            _ => {}
        }
    }
    if bytes.starts_with(b"\x89PNG") {
        "image/png"
    } else if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xD8 {
        "image/jpeg"
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        "image/webp"
    } else {
        "application/octet-stream"
    }
}

fn capture_fullscreen_png(dest: &Path, monitor_index: u32) -> Result<(), String> {
    ensure_parent(dest)?;
    capture_monitor_png(dest, monitor_index)
}

fn capture_window_png(dest: &Path) -> Result<(), String> {
    ensure_parent(dest)?;
    capture_focused_window_png(dest)
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn capture_monitor_png(dest: &Path, monitor_index: u32) -> Result<(), String> {
    ensure_screen_capture_access()?;
    use xcap::Monitor;
    let monitors = Monitor::all().map_err(|e| format!("Screen capture failed: {e}"))?;
    let monitor = monitors
        .into_iter()
        .nth(monitor_index as usize)
        .ok_or_else(|| "No display found for screen capture.".to_string())?;
    let image = monitor
        .capture_image()
        .map_err(|e| format!("Screen capture failed: {e}"))?;
    image
        .save(dest)
        .map_err(|e| format!("Screen capture failed: {e}"))?;
    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn is_system_capture_app(app_name: &str) -> bool {
    let app_l = app_name.to_lowercase();
    [
        "musomo",
        "dock",
        "systemuiserver",
        "control center",
        "notification center",
        "windowmanager",
        "loginwindow",
        "spotlight",
        "screencaptureui",
    ]
    .iter()
    .any(|needle| app_l.contains(needle))
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn is_capturable_window(window: &xcap::Window) -> bool {
    let Ok(width) = window.width() else {
        return false;
    };
    let Ok(height) = window.height() else {
        return false;
    };
    if width < 160 || height < 120 {
        return false;
    }
    if window.is_minimized().unwrap_or(true) {
        return false;
    }
    let Ok(app_name) = window.app_name() else {
        return false;
    };
    if is_system_capture_app(&app_name) {
        return false;
    }
    let Ok(title) = window.title() else {
        return true;
    };
    let title_l = title.to_lowercase();
    if title_l.is_empty() {
        return false;
    }
    !title_l.contains("select capture")
        && !title_l.contains("capture area")
        && !title_l.contains("musomo tracker")
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn pick_capture_window(windows: &[xcap::Window]) -> Option<&xcap::Window> {
    let mut candidates: Vec<&xcap::Window> = windows.iter().filter(|w| is_capturable_window(w)).collect();
    if candidates.is_empty() {
        return None;
    }
    candidates.sort_by_key(|w| w.z().unwrap_or(0));
    candidates.last().copied()
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn capture_focused_window_png(dest: &Path) -> Result<(), String> {
    ensure_screen_capture_access()?;
    use xcap::Window;
    let windows = Window::all().map_err(|e| format!("Window capture failed: {e}"))?;
    let window = pick_capture_window(&windows).ok_or_else(|| {
        "No suitable window found. Click the app you want to capture, then try again.".to_string()
    })?;
    let image = window
        .capture_image()
        .map_err(|e| format!("Window capture failed: {e}"))?;
    image
        .save(dest)
        .map_err(|e| format!("Window capture failed: {e}"))?;
    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn capture_area_region_png(dest: &Path, monitor_index: u32, region: &CaptureRegion) -> Result<(), String> {
    ensure_screen_capture_access()?;
    use xcap::Monitor;
    let monitor = Monitor::all()
        .map_err(|e| format!("Screen capture failed: {e}"))?
        .into_iter()
        .nth(monitor_index as usize)
        .ok_or_else(|| "No display found for area capture.".to_string())?;
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    let w = region.width.max(1) as u32;
    let h = region.height.max(1) as u32;
    let image = monitor
        .capture_region(x, y, w, h)
        .map_err(|e| format!("Area capture failed: {e}"))?;
    image
        .save(dest)
        .map_err(|e| format!("Area capture failed: {e}"))?;
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn capture_monitor_png(dest: &Path, _monitor_index: u32) -> Result<(), String> {
    let _ = dest;
    Err("Screen capture is not supported on this platform.".into())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn capture_focused_window_png(dest: &Path) -> Result<(), String> {
    let _ = dest;
    Err("Window capture is not supported on this platform.".into())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn capture_area_region_png(dest: &Path, _monitor_index: u32, _region: &CaptureRegion) -> Result<(), String> {
    let _ = dest;
    Err("Area capture is not supported on this platform.".into())
}

#[cfg(target_os = "macos")]
fn ensure_screen_capture_access() -> Result<(), String> {
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
        fn CGRequestScreenCaptureAccess() -> bool;
    }
    unsafe {
        if CGPreflightScreenCaptureAccess() {
            return Ok(());
        }
        if CGRequestScreenCaptureAccess() {
            return Ok(());
        }
    }
    Err(
        "Screen Recording permission required. Open System Settings → Privacy & Security → Screen Recording, enable Musomo Tracker, then quit and reopen the app."
            .into(),
    )
}

#[cfg(not(target_os = "macos"))]
fn ensure_screen_capture_access() -> Result<(), String> {
    Ok(())
}

#[cfg(all(target_os = "macos", test))]
mod macos_perm_tests {
    #[test]
    fn screen_capture_symbols_link() {
        extern "C" {
            fn CGPreflightScreenCaptureAccess() -> bool;
        }
        unsafe {
            let _ = CGPreflightScreenCaptureAccess();
        }
    }
}

fn crop_dynamic_image(img: &DynamicImage, region: &CaptureRegion) -> DynamicImage {
    let scale = if region.scale <= 0.0 { 1.0 } else { region.scale };
    let x = ((region.x as f64) * scale).round().max(0.0) as u32;
    let y = ((region.y as f64) * scale).round().max(0.0) as u32;
    let w = ((region.width as f64) * scale).round().max(1.0) as u32;
    let h = ((region.height as f64) * scale).round().max(1.0) as u32;
    let (iw, ih) = img.dimensions();
    let w = w.min(iw.saturating_sub(x)).max(1);
    let h = h.min(ih.saturating_sub(y)).max(1);
    img.crop_imm(x, y, w, h)
}

fn convert_png_to_webp_file(src: &Path, dest: &Path, quality: f32) -> Result<(), String> {
    let img = image::open(src).map_err(|e| e.to_string())?;
    save_webp(&img, dest, quality)
}

fn save_webp(img: &DynamicImage, dest: &Path, _quality: f32) -> Result<(), String> {
    let mut buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), ImageFormat::WebP)
        .map_err(|e| e.to_string())?;
    std::fs::write(dest, buf).map_err(|e| e.to_string())
}

fn encode_screenshot_as_jpeg(path: &Path) -> Result<Vec<u8>, String> {
    let img = load_image_any(path)?;
    let rgb = img.to_rgb8();
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    let mut encoder = JpegEncoder::new_with_quality(&mut cursor, JPEG_QUALITY);
    encoder
        .encode(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

fn load_image_any(path: &Path) -> Result<DynamicImage, String> {
    if let Ok(img) = image::open(path) {
        return Ok(img);
    }
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext == "webp" {
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
        return image::load_from_memory_with_format(&bytes, ImageFormat::WebP)
            .map_err(|e| e.to_string());
    }
    Err(format!("Unable to read screenshot: {}", path.display()))
}

fn ensure_parent(dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn now_ms_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_name_includes_date_session_and_id() {
        let name = build_file_name("2026-09-05", "1725542400000", "sess123", "ws001");
        assert!(name.ends_with(".webp"));
        assert!(name.contains("20260905"));
        assert!(name.contains("sess123"));
        assert!(name.contains("ws001"));
    }

    #[test]
    fn default_description_uses_project_name() {
        let desc = default_description("Musomo Tracker", "1725542400000");
        assert_eq!(desc, "Musomo Tracker");
    }

    #[test]
    fn jpeg_encoder_produces_bytes() {
        let img = DynamicImage::new_rgb8(32, 24);
        let tmp = std::env::temp_dir().join("musomo-test-shot.webp");
        save_webp(&img, &tmp, 80.0).expect("webp");
        let jpeg = encode_screenshot_as_jpeg(&tmp).expect("jpeg");
        assert!(jpeg.len() > 20);
        let _ = std::fs::remove_file(tmp);
    }

    #[test]
    fn read_image_file_data_url_keeps_webp_mime() {
        let img = DynamicImage::new_rgb8(48, 36);
        let tmp = std::env::temp_dir().join("musomo-test-thumb.webp");
        save_webp(&img, &tmp, 80.0).expect("webp");
        let data_url = read_image_file_data_url(&tmp).expect("data url");
        assert!(data_url.starts_with("data:image/webp;base64,"));
        let _ = std::fs::remove_file(tmp);
    }
}
