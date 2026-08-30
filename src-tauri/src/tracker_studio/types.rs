use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerClient {
    pub id: String,
    pub company: String,
    #[serde(default)]
    pub contact: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub website: String,
    #[serde(default)]
    pub vat: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub zip: String,
    #[serde(default)]
    pub city: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub rate: f64,
    /// ISO 4217 currency code (empty = use studio default).
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub favorite: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(default)]
    pub workspace_id: Option<String>,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerProjectSummary {
    pub name: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerProject {
    pub id: String,
    pub client_id: String,
    pub client: String,
    pub name: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub progress: i32,
    #[serde(default)]
    pub worked_min: i32,
    #[serde(default)]
    pub estimated_min: i32,
    #[serde(default)]
    pub deadline: String,
    #[serde(default)]
    pub accent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerTask {
    pub id: String,
    pub project_id: String,
    pub project: String,
    pub client: String,
    pub title: String,
    pub column: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub worked_min: i32,
    #[serde(default)]
    pub estimated_min: i32,
    #[serde(default)]
    pub deadline: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerSession {
    pub id: String,
    #[serde(default)]
    pub project_id: String,
    pub project: String,
    pub client: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub start: String,
    #[serde(default)]
    pub end: String,
    /// Break / pause duration in **seconds** (column name is historical).
    #[serde(default)]
    pub break_min: i32,
    #[serde(default)]
    pub description: String,
    /// Worked duration in **seconds** (column name is historical).
    #[serde(default)]
    pub duration_min: i32,
    #[serde(default)]
    pub cost: f64,
    #[serde(default)]
    pub rate: f64,
    #[serde(default)]
    pub when: String,
    #[serde(default)]
    pub period: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerModuleSettings {
    pub company: String,
    pub logo_initials: String,
    #[serde(default)]
    pub logo_data_url: String,
    /// Square avatar for the top-right profile chip (separate from print logo).
    #[serde(default)]
    pub avatar_data_url: String,
    #[serde(default)]
    pub display_name: String,
    pub default_rate: f64,
    /// ISO 4217 studio default currency (EUR, USD, …).
    #[serde(default = "default_currency_eur")]
    pub currency: String,
    pub report_footer: String,
    /// Optional HTML/text under the print logo on page 1 (email, phone, VAT…).
    #[serde(default)]
    pub report_header_note: String,
    /// Main app appearance: "light" or "dark" (mini timer stays dark).
    #[serde(default = "default_ui_theme_dark")]
    pub ui_theme: String,
    /// Display dates: "european" (DD/MM/YYYY) or "american" (MM/DD/YYYY). Storage stays ISO.
    #[serde(default = "default_date_format_european")]
    pub date_format: String,
}

fn default_date_format_european() -> String {
    "european".into()
}

fn default_ui_theme_dark() -> String {
    "dark".into()
}

fn default_currency_eur() -> String {
    "EUR".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerInheritedSettings {
    pub language: String,
    pub currency: String,
    pub date_format: String,
    pub time_format: String,
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerArchiveEntry {
    pub name: String,
    pub label: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerSnapshot {
    pub clients: Vec<TrackerClient>,
    pub projects: Vec<TrackerProject>,
    pub tasks: Vec<TrackerTask>,
    pub sessions: Vec<TrackerSession>,
    pub settings: TrackerModuleSettings,
    pub inherited: TrackerInheritedSettings,
}
