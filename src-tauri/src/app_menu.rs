//! Native menu bar (macOS / desktop) with localized labels — Musomo Tracker.

#![cfg(desktop)]

use std::collections::HashMap;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder, WINDOW_SUBMENU_ID};
use tauri::{AppHandle, Wry};

fn lbl(labels: &HashMap<String, String>, key: &str, fallback: &str) -> String {
    labels
        .get(key)
        .cloned()
        .unwrap_or_else(|| fallback.to_string())
}

pub fn build_app_menu(
    app: &AppHandle,
    labels: &HashMap<String, String>,
) -> tauri::Result<tauri::menu::Menu<Wry>> {
    let settings = MenuItemBuilder::with_id("settings", lbl(labels, "menuSettings", "Settings…"))
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let language_menu = SubmenuBuilder::new(app, lbl(labels, "menuLanguage", "Language"))
        .text("lang_system", lbl(labels, "menuLangSystem", "System"))
        .text("lang_en", lbl(labels, "menuLangEnglish", "English"))
        .text("lang_it", lbl(labels, "menuLangItalian", "Italian"))
        .text("lang_es", lbl(labels, "menuLangSpanish", "Spanish"))
        .text("lang_fr", lbl(labels, "menuLangFrench", "French"))
        .text("lang_de", lbl(labels, "menuLangGerman", "German"))
        .build()?;

    let app_menu = {
        let builder = SubmenuBuilder::new(app, lbl(labels, "menuApp", "Musomo Tracker"));
        #[cfg(target_os = "macos")]
        let builder = builder
            .text("about", lbl(labels, "menuAbout", "About Musomo Tracker"))
            .separator();
        let builder = builder.item(&settings).item(&language_menu);
        #[cfg(target_os = "macos")]
        let builder = builder
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator();
        #[cfg(not(target_os = "macos"))]
        let builder = builder.separator();
        builder.quit().build()?
    };

    let file_menu = SubmenuBuilder::new(app, lbl(labels, "menuFile", "File"))
        .close_window()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, lbl(labels, "menuEdit", "Edit"))
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .build()?;

    let window_menu =
        SubmenuBuilder::with_id(app, WINDOW_SUBMENU_ID, lbl(labels, "menuWindow", "Window"))
            .minimize()
            .maximize()
            .separator()
            .close_window()
            .build()?;

    let help_menu = SubmenuBuilder::new(app, lbl(labels, "menuHelp", "Help"))
        .text("about", lbl(labels, "menuAbout", "About Musomo Tracker"))
        .separator()
        .text("help_quick", lbl(labels, "menuHelpGuide", "Musomo Tracker guide"))
        .build()?;

    MenuBuilder::new(app)
        .items(&[&app_menu, &file_menu, &edit_menu, &window_menu, &help_menu])
        .build()
}

#[tauri::command]
pub fn update_app_menu(app: AppHandle, labels: HashMap<String, String>) -> Result<(), String> {
    let menu = build_app_menu(&app, &labels).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}
