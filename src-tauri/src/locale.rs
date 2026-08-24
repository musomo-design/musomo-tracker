//! System locale detection for UI language defaults.

#[cfg(target_os = "macos")]
pub fn system_locale_code() -> String {
    use std::process::Command;
    let output = Command::new("defaults")
        .args(["read", "-g", "AppleLanguages"])
        .output();
    let Ok(output) = output else {
        return "en".to_string();
    };
    if !output.status.success() {
        return "en".to_string();
    }
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let token = line
            .trim()
            .trim_matches(|c| matches!(c, '(' | ')' | '"' | ',' | ';'));
        if token.is_empty() {
            continue;
        }
        if let Some(code) = normalize_locale_code(token) {
            return code;
        }
    }
    "en".to_string()
}

#[cfg(target_os = "windows")]
pub fn system_locale_code() -> String {
    std::env::var("LANG")
        .ok()
        .or_else(|| std::env::var("LC_ALL").ok())
        .or_else(|| std::env::var("LC_MESSAGES").ok())
        .and_then(|v| normalize_locale_code(&v))
        .unwrap_or_else(|| "en".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn system_locale_code() -> String {
    std::env::var("LANG")
        .ok()
        .and_then(|v| normalize_locale_code(&v))
        .unwrap_or_else(|| "en".to_string())
}

fn normalize_locale_code(raw: &str) -> Option<String> {
    let base = raw.trim().to_lowercase().replace('_', "-");
    let code = base.split('-').next()?.trim();
    match code {
        "en" | "it" | "es" | "fr" | "de" => Some(code.to_string()),
        _ => None,
    }
}

#[tauri::command]
pub fn get_system_locale() -> String {
    system_locale_code()
}
