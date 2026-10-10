use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const CAPTURE_OVERLAY_LABEL: &str = "capture-overlay";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub scale: f64,
}

struct CapturePickerState {
    result: Option<Result<Option<CaptureRegion>, String>>,
}

static CAPTURE_PICKER: Mutex<Option<CapturePickerState>> = Mutex::new(None);

fn set_picker_result(value: Result<Option<CaptureRegion>, String>) {
    if let Ok(mut guard) = CAPTURE_PICKER.lock() {
        if let Some(state) = guard.as_mut() {
            state.result = Some(value);
        }
    }
}

pub fn pick_capture_region(app: &AppHandle, monitor_index: u32) -> Result<Option<CaptureRegion>, String> {
    {
        let mut guard = CAPTURE_PICKER
            .lock()
            .map_err(|_| "Capture picker lock poisoned.".to_string())?;
        *guard = Some(CapturePickerState { result: None });
    }

    open_capture_overlay(app, monitor_index)?;

    for _ in 0..1200 {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let done = {
            let guard = CAPTURE_PICKER
                .lock()
                .map_err(|_| "Capture picker lock poisoned.".to_string())?;
            guard
                .as_ref()
                .and_then(|s| s.result.as_ref())
                .cloned()
        };
        if let Some(result) = done {
            close_capture_overlay(app);
            let mut guard = CAPTURE_PICKER
                .lock()
                .map_err(|_| "Capture picker lock poisoned.".to_string())?;
            *guard = None;
            return match result {
                Ok(region) => Ok(region),
                Err(err) => Err(err),
            };
        }
    }

    close_capture_overlay(app);
    let mut guard = CAPTURE_PICKER
        .lock()
        .map_err(|_| "Capture picker lock poisoned.".to_string())?;
    *guard = None;
    Err("Capture area selection timed out.".into())
}

pub fn submit_capture_region(region: CaptureRegion) -> Result<(), String> {
    if region.width < 4 || region.height < 4 {
        return Err("Selected area is too small.".into());
    }
    set_picker_result(Ok(Some(region)));
    Ok(())
}

pub fn cancel_capture_region() -> Result<(), String> {
    set_picker_result(Ok(None));
    Ok(())
}

fn monitor_bounds(monitor_index: u32) -> Result<(f64, f64, f64, f64), String> {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        use xcap::Monitor;
        let monitor = Monitor::all()
            .map_err(|e| format!("Screen capture failed: {e}"))?
            .into_iter()
            .nth(monitor_index as usize)
            .ok_or_else(|| "No display found for area capture.".to_string())?;
        let x = monitor.x().map_err(|e| e.to_string())? as f64;
        let y = monitor.y().map_err(|e| e.to_string())? as f64;
        let w = monitor.width().map_err(|e| e.to_string())? as f64;
        let h = monitor.height().map_err(|e| e.to_string())? as f64;
        return Ok((x, y, w, h));
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = monitor_index;
        Err("Area capture is not supported on this platform.".into())
    }
}

fn open_capture_overlay(app: &AppHandle, monitor_index: u32) -> Result<(), String> {
    let (mx, my, mw, mh) = monitor_bounds(monitor_index)?;

    if let Some(window) = app.get_webview_window(CAPTURE_OVERLAY_LABEL) {
        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(mx, my)))
            .map_err(|e| e.to_string())?;
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize::new(mw, mh)))
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        CAPTURE_OVERLAY_LABEL,
        WebviewUrl::App("tracker-studio/capture-overlay.html".into()),
    )
    .title("Select capture area")
    .position(mx, my)
    .inner_size(mw, mh)
    .decorations(false)
    .always_on_top(true)
    .visible(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn close_capture_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(CAPTURE_OVERLAY_LABEL) {
        let _ = window.hide();
        let _ = window.close();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capture_region_minimum_size() {
        {
            let mut guard = CAPTURE_PICKER.lock().unwrap();
            *guard = Some(CapturePickerState { result: None });
        }
        let tiny = CaptureRegion {
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            scale: 1.0,
        };
        assert!(submit_capture_region(tiny).is_err());
    }
}
