use super::types::*;
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;

const DB_VERSION: i32 = 7;

pub fn db_path() -> Result<PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "No data directory.".to_string())?;
    // Independent from Visual Search — do not share musomo-visual-search/tracker-studio.
    Ok(base.join("musomo-tracker").join("tracker.db"))
}

pub fn archive_dir() -> Result<PathBuf, String> {
    let path = db_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "No archive directory.".to_string())?;
    Ok(parent.join("archives"))
}

pub fn assets_dir() -> Result<PathBuf, String> {
    let path = db_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "No assets directory.".to_string())?;
    Ok(parent.join("assets"))
}

fn stamp_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // YYYYMMDD-HHMMSS-ish from unix (good enough for sort keys)
    let days = secs / 86400;
    let tod = secs % 86400;
    let h = tod / 3600;
    let m = (tod % 3600) / 60;
    let s = tod % 60;
    format!("{days:05}-{h:02}{m:02}{s:02}")
}

/// Copy current DB into archives/ before destructive ops. Returns archive file name.
pub fn archive_current_database() -> Result<String, String> {
    let src = db_path()?;
    if !src.exists() {
        return Ok(String::new());
    }
    {
        let conn = open_db()?;
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    }
    let dir = archive_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = format!("tracker-backup-{}.db", stamp_now());
    let dest = dir.join(&name);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(name)
}

pub fn list_archives() -> Result<Vec<String>, String> {
    let dir = archive_dir()?;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut names = vec![];
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("db") {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with("tracker-backup-") {
                names.push(name.to_string());
            }
        }
    }
    names.sort();
    names.reverse();
    Ok(names)
}

fn safe_archive_path(name: &str) -> Result<PathBuf, String> {
    let base = name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(name)
        .to_string();
    if !base.starts_with("tracker-backup-") || !base.ends_with(".db") {
        return Err("Invalid archive name.".into());
    }
    if base.contains("..") {
        return Err("Invalid archive name.".into());
    }
    Ok(archive_dir()?.join(base))
}

/// Restore clients/projects/tasks/sessions from an archive. Keeps current settings/logos.
pub fn restore_from_archive(name: String) -> Result<TrackerSnapshot, String> {
    let archive_path = safe_archive_path(&name)?;
    if !archive_path.exists() {
        return Err("Archive not found.".into());
    }
    let conn = open_db()?;
    // Snapshot current settings before wipe.
    let settings = load_module_settings(&conn)?;
    let auto_seed = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'auto_seed_disabled'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "1".into());

    conn.execute_batch(
        "
        DELETE FROM time_sessions;
        DELETE FROM tasks;
        DELETE FROM projects;
        DELETE FROM clients;
        ",
    )
    .map_err(|e| e.to_string())?;

    let attach_path = archive_path.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!("ATTACH DATABASE '{attach_path}' AS archive;"))
        .map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        INSERT INTO clients SELECT * FROM archive.clients;
        INSERT INTO projects SELECT * FROM archive.projects;
        INSERT INTO tasks SELECT * FROM archive.tasks;
        INSERT INTO time_sessions SELECT * FROM archive.time_sessions;
        DETACH DATABASE archive;
        ",
    )
    .map_err(|e| e.to_string())?;

    // Restore logos/settings we preserved.
    save_module_settings(&conn, &settings)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('auto_seed_disabled', ?1)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![auto_seed],
    )
    .map_err(|e| e.to_string())?;

    snapshot_from_conn(&conn)
}

fn snapshot_from_conn(conn: &Connection) -> Result<TrackerSnapshot, String> {
    let clients = list_clients(conn)?;
    let projects = list_projects(conn)?;
    let tasks = list_tasks(conn)?;
    let sessions = list_sessions(conn)?;
    let settings = load_module_settings(conn)?;
    let inherited = TrackerInheritedSettings {
        language: "English".into(),
        currency: settings.currency.clone(),
        date_format: inherited_date_format_label(&settings.date_format),
        time_format: "24-hour".into(),
        theme: "Light".into(),
    };
    Ok(TrackerSnapshot {
        clients,
        projects,
        tasks,
        sessions,
        settings,
        inherited,
    })
}

fn open_db() -> Result<Connection, String> {
    let path = db_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

fn table_has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?;
    for row in rows {
        if row.map_err(|e| e.to_string())? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn ensure_column(conn: &Connection, table: &str, column: &str, decl: &str) -> Result<(), String> {
    if table_has_column(conn, table, column)? {
        return Ok(());
    }
    conn.execute(
        &format!("ALTER TABLE {table} ADD COLUMN {column} {decl}"),
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn migrate(conn: &Connection) -> Result<(), String> {
    let version: i32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap_or(0);

    if version < 1 {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                company TEXT NOT NULL,
                contact TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                website TEXT NOT NULL DEFAULT '',
                vat TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                rate REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                tags_json TEXT NOT NULL DEFAULT '[]',
                favorite INTEGER NOT NULL DEFAULT 0,
                archived INTEGER NOT NULL DEFAULT 0,
                workspace_id TEXT,
                updated_at TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                worked_min INTEGER NOT NULL DEFAULT 0,
                estimated_min INTEGER NOT NULL DEFAULT 0,
                deadline TEXT NOT NULL DEFAULT '',
                accent TEXT NOT NULL DEFAULT '#22c55e',
                workspace_id TEXT,
                updated_at TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                column_id TEXT NOT NULL DEFAULT 'todo',
                priority TEXT NOT NULL DEFAULT 'medium',
                worked_min INTEGER NOT NULL DEFAULT 0,
                estimated_min INTEGER NOT NULL DEFAULT 0,
                deadline TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS time_sessions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL DEFAULT '',
                project_name TEXT NOT NULL DEFAULT '',
                client_name TEXT NOT NULL DEFAULT '',
                session_date TEXT NOT NULL DEFAULT '',
                time_start TEXT NOT NULL DEFAULT '',
                time_end TEXT NOT NULL DEFAULT '',
                break_min INTEGER NOT NULL DEFAULT 0,
                description TEXT NOT NULL DEFAULT '',
                duration_min INTEGER NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0,
                rate REAL NOT NULL DEFAULT 0,
                logged_when TEXT NOT NULL DEFAULT '',
                period TEXT NOT NULL DEFAULT 'today',
                created_at TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            PRAGMA user_version = 1;
            ",
        )
        .map_err(|e| e.to_string())?;
    }

    if version < 2 {
        ensure_column(conn, "time_sessions", "project_id", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "time_sessions", "session_date", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "time_sessions", "time_start", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "time_sessions", "time_end", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "time_sessions", "break_min", "INTEGER NOT NULL DEFAULT 0")?;
        ensure_column(conn, "time_sessions", "description", "TEXT NOT NULL DEFAULT ''")?;
        conn.execute_batch(
            "
            UPDATE time_sessions
            SET project_id = COALESCE((
                SELECT p.id FROM projects p WHERE p.name = time_sessions.project_name LIMIT 1
            ), IFNULL(project_id, ''))
            WHERE IFNULL(project_id, '') = '';
            ",
        )
        .map_err(|e| e.to_string())?;
        recalc_all_project_hours(conn)?;
        conn.pragma_update(None, "user_version", 2)
            .map_err(|e| e.to_string())?;
    }

    if version < 3 {
        ensure_column(conn, "clients", "zip", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "clients", "city", "TEXT NOT NULL DEFAULT ''")?;
        conn.pragma_update(None, "user_version", 3)
            .map_err(|e| e.to_string())?;
    }

    // break_min column now stores pause/break duration in seconds (was whole minutes).
    if version < 4 {
        conn.execute("UPDATE time_sessions SET break_min = break_min * 60", [])
            .map_err(|e| e.to_string())?;
        conn.pragma_update(None, "user_version", 4)
            .map_err(|e| e.to_string())?;
    }

    // duration_min column now stores worked duration in seconds (was whole minutes).
    if version < 5 {
        conn.execute("UPDATE time_sessions SET duration_min = duration_min * 60", [])
            .map_err(|e| e.to_string())?;
        conn.pragma_update(None, "user_version", 5)
            .map_err(|e| e.to_string())?;
    }

    // Studio + per-client currency codes (ISO 4217).
    if version < 6 {
        let _ = conn.execute(
            "ALTER TABLE clients ADD COLUMN currency TEXT NOT NULL DEFAULT ''",
            [],
        );
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('currency', 'EUR')
             ON CONFLICT(key) DO NOTHING",
            [],
        )
        .map_err(|e| e.to_string())?;
        conn.pragma_update(None, "user_version", 6)
            .map_err(|e| e.to_string())?;
    }

    if version < 7 {
        ensure_column(conn, "time_sessions", "rate", "REAL NOT NULL DEFAULT 0")?;
        conn.execute(
            "UPDATE time_sessions
             SET rate = cost / (duration_min / 3600.0)
             WHERE duration_min > 0 AND cost > 0 AND IFNULL(rate, 0) = 0",
            [],
        )
        .ok();
        conn.pragma_update(None, "user_version", DB_VERSION)
            .map_err(|e| e.to_string())?;
    }

    seed_if_empty(conn)?;
    Ok(())
}

fn seed_if_empty(conn: &Connection) -> Result<(), String> {
    let skip = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'auto_seed_disabled'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_default();
    if skip == "1" {
        return Ok(());
    }

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Ok(());
    }

    for client in seed_clients() {
        upsert_client(conn, &client)?;
    }
    for project in seed_projects() {
        upsert_project(conn, &project)?;
    }
    for task in seed_tasks() {
        upsert_task(conn, &task)?;
    }
    for session in seed_sessions() {
        upsert_session(conn, &session)?;
    }
    save_module_settings(conn, &demo_settings())?;
    Ok(())
}

fn demo_settings() -> TrackerModuleSettings {
    TrackerModuleSettings {
        company: "Northstar Creative Studio".into(),
        logo_initials: "NC".into(),
        logo_data_url: String::new(),
        avatar_data_url: String::new(),
        display_name: "Alex".into(),
        default_rate: 75.0,
        currency: "EUR".into(),
        report_footer: "Thank you for your business. Payment due within 30 days.".into(),
        report_header_note: String::new(),
        ui_theme: "dark".into(),
        date_format: "european".into(),
    }
}

fn normalize_date_format(value: &str) -> String {
    let v = value.trim().to_lowercase();
    if v == "american" || v == "mm/dd/yyyy" || v == "mdy" || v == "us" {
        "american".into()
    } else {
        "european".into()
    }
}

fn inherited_date_format_label(value: &str) -> String {
    if normalize_date_format(value) == "american" {
        "MM/DD/YYYY".into()
    } else {
        "DD/MM/YYYY".into()
    }
}

fn clear_brand_assets() -> Result<(), String> {
    let dir = assets_dir()?;
    for name in ["print-logo.png", "print-logo.svg", "avatar.png", "avatar.svg"] {
        let path = dir.join(name);
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Wipe Tracker Studio data tables. Clean preserves settings; Restore Demo resets
/// settings and brand images to the reusable Northstar demo profile.
/// Always archives the DB first.
pub fn reset_database(reseed: bool) -> Result<TrackerSnapshot, String> {
    let _archive_name = archive_current_database()?;
    let conn = open_db()?;
    // Keep logos / studio profile — only wipe operational data.
    conn.execute_batch(
        "
        DELETE FROM time_sessions;
        DELETE FROM tasks;
        DELETE FROM projects;
        DELETE FROM clients;
        ",
    )
    .map_err(|e| e.to_string())?;

    if reseed {
        // Allow seed once for restore-demo, then leave seeded data.
        conn.execute("DELETE FROM settings WHERE key = 'auto_seed_disabled'", [])
            .map_err(|e| e.to_string())?;
        // seed_if_empty would overwrite settings logos — seed rows only.
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        if count == 0 {
            for client in seed_clients() {
                upsert_client(&conn, &client)?;
            }
            for project in seed_projects() {
                upsert_project(&conn, &project)?;
            }
            for task in seed_tasks() {
                upsert_task(&conn, &task)?;
            }
            for session in seed_sessions() {
                upsert_session(&conn, &session)?;
            }
        }
        clear_brand_assets()?;
        save_module_settings(&conn, &demo_settings())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('auto_seed_disabled', '1')
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('auto_seed_disabled', '1')
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    snapshot_from_conn(&conn)
}

pub fn load_snapshot() -> Result<TrackerSnapshot, String> {
    let conn = open_db()?;
    snapshot_from_conn(&conn)
}

pub fn upsert_client_record(client: TrackerClient) -> Result<TrackerClient, String> {
    let conn = open_db()?;
    upsert_client(&conn, &client)?;
    Ok(client)
}

pub fn upsert_project_record(project: TrackerProject) -> Result<TrackerProject, String> {
    let conn = open_db()?;
    upsert_project(&conn, &project)?;
    list_projects(&conn)?
        .into_iter()
        .find(|p| p.id == project.id)
        .ok_or_else(|| "Project not found after save.".to_string())
}

pub fn delete_project_record(id: String) -> Result<(), String> {
    let conn = open_db()?;
    conn.execute("DELETE FROM time_sessions WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_client_record(id: String) -> Result<(), String> {
    let conn = open_db()?;
    let project_ids: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM projects WHERE client_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    for project_id in &project_ids {
        conn.execute(
            "DELETE FROM time_sessions WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM tasks WHERE project_id = ?1", params![project_id])
            .map_err(|e| e.to_string())?;
    }
    // Also clear sessions that only matched by client name.
    let company: String = conn
        .query_row(
            "SELECT company FROM clients WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or_default();
    if !company.is_empty() {
        conn.execute(
            "DELETE FROM time_sessions WHERE client_name = ?1",
            params![company],
        )
        .map_err(|e| e.to_string())?;
    }
    conn.execute("DELETE FROM clients WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn upsert_task_record(task: TrackerTask) -> Result<TrackerTask, String> {
    let conn = open_db()?;
    upsert_task(&conn, &task)?;
    list_tasks(&conn)?
        .into_iter()
        .find(|t| t.id == task.id)
        .ok_or_else(|| "Task not found after save.".to_string())
}

pub fn upsert_session_record(session: TrackerSession) -> Result<TrackerSession, String> {
    let conn = open_db()?;
    let old_project_id: String = conn
        .query_row(
            "SELECT IFNULL(project_id, '') FROM time_sessions WHERE id = ?1",
            params![session.id],
            |row| row.get(0),
        )
        .unwrap_or_default();
    upsert_session(&conn, &session)?;
    recalc_project_hours(&conn, &session.project_id)?;
    if !old_project_id.is_empty() && old_project_id != session.project_id {
        recalc_project_hours(&conn, &old_project_id)?;
    }
    Ok(session)
}

pub fn delete_session_record(id: String) -> Result<(), String> {
    let conn = open_db()?;
    let project_id: String = conn
        .query_row(
            "SELECT IFNULL(project_id, '') FROM time_sessions WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or_default();
    conn.execute("DELETE FROM time_sessions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    if !project_id.is_empty() {
        recalc_project_hours(&conn, &project_id)?;
    }
    Ok(())
}

pub fn save_settings_record(settings: TrackerModuleSettings) -> Result<TrackerModuleSettings, String> {
    let conn = open_db()?;
    save_module_settings(&conn, &settings)?;
    // Return hydrated logos from assets/ — never wipe in-memory brand images on Save.
    load_module_settings(&conn)
}

const OPEN_TIMER_KEY: &str = "open_timer_runtime";

pub fn save_open_timer_json(json: &str) -> Result<(), String> {
    let conn = open_db()?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![OPEN_TIMER_KEY, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_open_timer_json() -> Result<Option<String>, String> {
    let conn = open_db()?;
    let json: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![OPEN_TIMER_KEY],
            |row| row.get(0),
        )
        .unwrap_or_default();
    if json.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(json))
    }
}

fn upsert_client(conn: &Connection, client: &TrackerClient) -> Result<(), String> {
    let tags_json = serde_json::to_string(&client.tags).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO clients (
            id, company, contact, email, phone, website, vat, address, zip, city, notes, rate, currency, status,
            tags_json, favorite, archived, workspace_id, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)
        ON CONFLICT(id) DO UPDATE SET
            company=excluded.company, contact=excluded.contact, email=excluded.email,
            phone=excluded.phone, website=excluded.website, vat=excluded.vat,
            address=excluded.address, zip=excluded.zip, city=excluded.city,
            notes=excluded.notes, rate=excluded.rate, currency=excluded.currency,
            status=excluded.status, tags_json=excluded.tags_json, favorite=excluded.favorite,
            archived=excluded.archived, workspace_id=excluded.workspace_id,
            updated_at=excluded.updated_at",
        params![
            client.id,
            client.company,
            client.contact,
            client.email,
            client.phone,
            client.website,
            client.vat,
            client.address,
            client.zip,
            client.city,
            client.notes,
            client.rate,
            client.currency,
            client.status,
            tags_json,
            client.favorite as i32,
            client.archived as i32,
            client.workspace_id,
            client.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_project(conn: &Connection, project: &TrackerProject) -> Result<(), String> {
    conn.execute(
        "INSERT INTO projects (
            id, client_id, name, category, status, progress, worked_min, estimated_min,
            deadline, accent, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
        ON CONFLICT(id) DO UPDATE SET
            client_id=excluded.client_id, name=excluded.name, category=excluded.category,
            status=excluded.status, progress=excluded.progress, worked_min=excluded.worked_min,
            estimated_min=excluded.estimated_min, deadline=excluded.deadline,
            accent=excluded.accent, updated_at=excluded.updated_at",
        params![
            project.id,
            project.client_id,
            project.name,
            project.category,
            project.status,
            project.progress,
            project.worked_min,
            project.estimated_min,
            project.deadline,
            project.accent,
            chrono_now_date(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_task(conn: &Connection, task: &TrackerTask) -> Result<(), String> {
    conn.execute(
        "INSERT INTO tasks (
            id, project_id, title, column_id, priority, worked_min, estimated_min, deadline, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
        ON CONFLICT(id) DO UPDATE SET
            project_id=excluded.project_id, title=excluded.title, column_id=excluded.column_id,
            priority=excluded.priority, worked_min=excluded.worked_min,
            estimated_min=excluded.estimated_min, deadline=excluded.deadline,
            updated_at=excluded.updated_at",
        params![
            task.id,
            task.project_id,
            task.title,
            task.column,
            task.priority,
            task.worked_min,
            task.estimated_min,
            task.deadline,
            chrono_now_date(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn upsert_session(conn: &Connection, session: &TrackerSession) -> Result<(), String> {
    conn.execute(
        "INSERT INTO time_sessions (
            id, project_id, project_name, client_name, session_date, time_start, time_end,
            break_min, description, duration_min, cost, rate, logged_when, period, created_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
        ON CONFLICT(id) DO UPDATE SET
            project_id=excluded.project_id,
            project_name=excluded.project_name,
            client_name=excluded.client_name,
            session_date=excluded.session_date,
            time_start=excluded.time_start,
            time_end=excluded.time_end,
            break_min=excluded.break_min,
            description=excluded.description,
            duration_min=excluded.duration_min,
            cost=excluded.cost,
            rate=excluded.rate,
            logged_when=excluded.logged_when,
            period=excluded.period",
        params![
            session.id,
            session.project_id,
            session.project,
            session.client,
            session.date,
            session.start,
            session.end,
            session.break_min,
            session.description,
            session.duration_min,
            session.cost,
            session.rate,
            session.when,
            session.period,
            chrono_now_date(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn recalc_project_hours(conn: &Connection, project_id: &str) -> Result<(), String> {
    if project_id.is_empty() {
        return Ok(());
    }
    let worked: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(duration_min), 0) FROM time_sessions
             WHERE project_id = ?1
                OR (IFNULL(project_id,'') = '' AND project_name = (SELECT name FROM projects WHERE id = ?1))",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let estimated: i32 = conn
        .query_row(
            "SELECT estimated_min FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let progress = if estimated > 0 {
        ((worked as f64 / estimated as f64) * 100.0).round().clamp(0.0, 100.0) as i32
    } else {
        0
    };
    conn.execute(
        "UPDATE projects SET worked_min = ?1, progress = ?2, updated_at = ?3 WHERE id = ?4",
        params![worked, progress, chrono_now_date(), project_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn recalc_all_project_hours(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id FROM projects")
        .map_err(|e| e.to_string())?;
    let ids = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    for id in ids {
        recalc_project_hours(conn, &id)?;
    }
    Ok(())
}


fn list_clients(conn: &Connection) -> Result<Vec<TrackerClient>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, company, contact, email, phone, website, vat, address, zip, city, notes, rate,
             COALESCE(currency, ''), status, tags_json, favorite, archived, workspace_id, updated_at
             FROM clients ORDER BY company",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let tags_json: String = row.get(14)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            Ok(TrackerClient {
                id: row.get(0)?,
                company: row.get(1)?,
                contact: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                website: row.get(5)?,
                vat: row.get(6)?,
                address: row.get(7)?,
                zip: row.get(8)?,
                city: row.get(9)?,
                notes: row.get(10)?,
                rate: row.get(11)?,
                currency: row.get(12)?,
                status: row.get(13)?,
                tags,
                favorite: row.get::<_, i32>(15)? != 0,
                archived: row.get::<_, i32>(16)? != 0,
                workspace_id: row.get(17)?,
                updated_at: row.get(18)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn list_projects(conn: &Connection) -> Result<Vec<TrackerProject>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.client_id, c.company, p.name, p.category, p.status, p.progress,
             p.worked_min, p.estimated_min, p.deadline, p.accent
             FROM projects p JOIN clients c ON c.id = p.client_id ORDER BY p.name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TrackerProject {
                id: row.get(0)?,
                client_id: row.get(1)?,
                client: row.get(2)?,
                name: row.get(3)?,
                category: row.get(4)?,
                status: row.get(5)?,
                progress: row.get(6)?,
                worked_min: row.get(7)?,
                estimated_min: row.get(8)?,
                deadline: row.get(9)?,
                accent: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn list_tasks(conn: &Connection) -> Result<Vec<TrackerTask>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.project_id, p.name, c.company, t.title, t.column_id, t.priority,
             t.worked_min, t.estimated_min, t.deadline
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             JOIN clients c ON c.id = p.client_id
             ORDER BY t.title",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TrackerTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project: row.get(2)?,
                client: row.get(3)?,
                title: row.get(4)?,
                column: row.get(5)?,
                priority: row.get(6)?,
                worked_min: row.get(7)?,
                estimated_min: row.get(8)?,
                deadline: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn list_sessions(conn: &Connection) -> Result<Vec<TrackerSession>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, IFNULL(project_id,''), project_name, client_name,
             IFNULL(session_date,''), IFNULL(time_start,''), IFNULL(time_end,''),
             IFNULL(break_min,0), IFNULL(description,''),
             duration_min, cost, IFNULL(rate,0), logged_when, period
             FROM time_sessions ORDER BY session_date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(TrackerSession {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project: row.get(2)?,
                client: row.get(3)?,
                date: row.get(4)?,
                start: row.get(5)?,
                end: row.get(6)?,
                break_min: row.get(7)?,
                description: row.get(8)?,
                duration_min: row.get(9)?,
                cost: row.get(10)?,
                rate: row.get(11)?,
                when: row.get(12)?,
                period: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}


fn load_module_settings(conn: &Connection) -> Result<TrackerModuleSettings, String> {
    let mut settings = TrackerModuleSettings {
        company: "Northstar Creative Studio".into(),
        logo_initials: "NC".into(),
        logo_data_url: String::new(),
        avatar_data_url: String::new(),
        display_name: "Alex".into(),
        default_rate: 75.0,
        currency: "EUR".into(),
        report_footer: "Thank you for your business.".into(),
        report_header_note: String::new(),
        ui_theme: "dark".into(),
        date_format: "european".into(),
    };
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        match key.as_str() {
            "company" => settings.company = value,
            "logo_initials" => settings.logo_initials = value,
            "logo_data_url" => settings.logo_data_url = value,
            "avatar_data_url" => settings.avatar_data_url = value,
            "display_name" => settings.display_name = value,
            "default_rate" => settings.default_rate = value.parse().unwrap_or(settings.default_rate),
            "currency" => {
                let code = value.trim().to_uppercase();
                if code.len() == 3 {
                    settings.currency = code;
                }
            }
            "report_footer" => settings.report_footer = value,
            "report_header_note" => settings.report_header_note = value,
            "ui_theme" => {
                let t = value.trim().to_lowercase();
                settings.ui_theme = if t == "dark" { "dark".into() } else { "light".into() };
            }
            "date_format" => settings.date_format = normalize_date_format(&value),
            _ => {}
        }
    }
    // Prefer on-disk brand assets (survives clean; avoids huge SQLite IPC payloads).
    hydrate_brand_from_files(&mut settings)?;
    // Migrate legacy in-DB data URLs to files once.
    migrate_brand_data_urls_to_files(conn, &mut settings)?;
    Ok(settings)
}

fn data_url_from_png_bytes(bytes: &[u8]) -> String {
    use base64::Engine;
    format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

fn read_asset_data_url(file_name: &str) -> Result<Option<String>, String> {
    let path = assets_dir()?.join(file_name);
    if !path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.is_empty() {
        return Ok(None);
    }
    // Detect png/jpeg/webp by magic; default to png mime for display.
    let mime = if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "image/png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if bytes.len() > 12 && &bytes[0..4] == b"RIFF" {
        "image/webp"
    } else if bytes.windows(4).any(|w| w == b"<svg" || w == b"<SVG")
        || std::str::from_utf8(&bytes)
            .map(|s| s.contains("<svg"))
            .unwrap_or(false)
    {
        "image/svg+xml"
    } else {
        "image/png"
    };
    use base64::Engine;
    Ok(Some(format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )))
}

fn hydrate_brand_from_files(settings: &mut TrackerModuleSettings) -> Result<(), String> {
    if let Some(url) = read_asset_data_url("print-logo.png")? {
        settings.logo_data_url = url;
    } else if let Some(url) = read_asset_data_url("print-logo.svg")? {
        settings.logo_data_url = url;
    }
    if let Some(url) = read_asset_data_url("avatar.png")? {
        settings.avatar_data_url = url;
    } else if let Some(url) = read_asset_data_url("avatar.svg")? {
        settings.avatar_data_url = url;
    }
    Ok(())
}

fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let data_url = data_url.trim();
    let (_, b64) = data_url
        .split_once("base64,")
        .ok_or_else(|| "Invalid image data (expected data URL).".to_string())?;
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(b64.trim())
        .map_err(|e| format!("Invalid image encoding: {e}"))
}

fn write_brand_png(file_name: &str, bytes: &[u8], kind: &str) -> Result<Vec<u8>, String> {
    use image::imageops::FilterType;
    use std::io::Cursor;

    let img = image::load_from_memory(bytes).map_err(|e| format!("Cannot read image: {e}"))?;
    let img = if kind == "avatar" {
        img.resize_to_fill(256, 256, FilterType::Lanczos3)
    } else {
        // Report logo box is ~165×95 — 400px wide is more than enough @2x.
        img.resize(400, 400, FilterType::Lanczos3)
    };
    let dir = assets_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(file_name);
    let mut out = Vec::new();
    img.write_to(&mut Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|e| format!("Cannot encode PNG: {e}"))?;
    fs::write(&path, &out).map_err(|e| e.to_string())?;
    Ok(out)
}

fn migrate_brand_data_urls_to_files(
    conn: &Connection,
    settings: &mut TrackerModuleSettings,
) -> Result<(), String> {
    // If SQLite still holds a huge data URL and file is missing, export to assets.
    let logo_path = assets_dir()?.join("print-logo.png");
    if !logo_path.exists() && settings.logo_data_url.starts_with("data:image") {
        if let Ok(bytes) = decode_data_url(&settings.logo_data_url) {
            if let Ok(png) = write_brand_png("print-logo.png", &bytes, "logo") {
                settings.logo_data_url = data_url_from_png_bytes(&png);
                // Clear DB blob to keep settings small.
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES ('logo_data_url', '')
                     ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    [],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    let avatar_path = assets_dir()?.join("avatar.png");
    if !avatar_path.exists() && settings.avatar_data_url.starts_with("data:image") {
        if let Ok(bytes) = decode_data_url(&settings.avatar_data_url) {
            if let Ok(png) = write_brand_png("avatar.png", &bytes, "avatar") {
                settings.avatar_data_url = data_url_from_png_bytes(&png);
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES ('avatar_data_url', '')
                     ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    [],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

/// Save print logo or avatar to disk; keep SQLite free of large blobs.
pub fn save_brand_image(kind: String, data_url: String) -> Result<TrackerModuleSettings, String> {
    let kind = kind.to_lowercase();
    let is_avatar = kind == "avatar";
    if !matches!(kind.as_str(), "avatar" | "logo" | "print" | "print-logo") {
        return Err("Unknown brand image kind (use logo or avatar).".into());
    }
    let raw = decode_data_url(&data_url)?;
    if raw.len() > 12 * 1024 * 1024 {
        return Err("Image is too large (max 12 MB before processing).".into());
    }

    let dir = assets_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let is_svg = data_url.contains("image/svg");
    if is_svg {
        let name = if is_avatar {
            "avatar.svg"
        } else {
            "print-logo.svg"
        };
        fs::write(dir.join(name), &raw).map_err(|e| e.to_string())?;
        if is_avatar {
            let _ = fs::remove_file(dir.join("avatar.png"));
        } else {
            let _ = fs::remove_file(dir.join("print-logo.png"));
        }
    } else {
        let file_name = if is_avatar {
            "avatar.png"
        } else {
            "print-logo.png"
        };
        write_brand_png(file_name, &raw, if is_avatar { "avatar" } else { "logo" })?;
        if is_avatar {
            let _ = fs::remove_file(dir.join("avatar.svg"));
        } else {
            let _ = fs::remove_file(dir.join("print-logo.svg"));
        }
    }

    let conn = open_db()?;
    let key = if is_avatar {
        "avatar_data_url"
    } else {
        "logo_data_url"
    };
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, '')
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key],
    )
    .map_err(|e| e.to_string())?;
    load_module_settings(&conn)
}

/// Import brand image from a filesystem path (native dialog).
pub fn import_brand_file(kind: String, path: String) -> Result<TrackerModuleSettings, String> {
    let path = PathBuf::from(path.trim());
    if !path.is_file() {
        return Err("Selected file was not found.".into());
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.is_empty() {
        return Err("Selected file is empty.".into());
    }
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        _ => {
            if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
                "image/png"
            } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
                "image/jpeg"
            } else if std::str::from_utf8(&bytes)
                .map(|s| s.contains("<svg"))
                .unwrap_or(false)
            {
                "image/svg+xml"
            } else {
                return Err("Use PNG, JPEG or SVG.".into());
            }
        }
    };
    use base64::Engine;
    let data_url = format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    );
    save_brand_image(kind, data_url)
}

fn save_module_settings(conn: &Connection, settings: &TrackerModuleSettings) -> Result<(), String> {
    // Never persist huge data-URLs into SQLite — files are the source of truth.
    let pairs = [
        ("company", settings.company.as_str()),
        ("logo_initials", settings.logo_initials.as_str()),
        ("logo_data_url", ""),
        ("avatar_data_url", ""),
        ("display_name", settings.display_name.as_str()),
        ("default_rate", &settings.default_rate.to_string()),
        ("currency", settings.currency.as_str()),
        ("report_footer", settings.report_footer.as_str()),
        ("report_header_note", settings.report_header_note.as_str()),
        ("ui_theme", settings.ui_theme.as_str()),
        ("date_format", settings.date_format.as_str()),
    ];
    for (key, value) in pairs {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1,?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn chrono_now_date() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}", secs / 86400)
}

fn seed_clients() -> Vec<TrackerClient> {
    vec![
        TrackerClient {
            id: "c1".into(),
            company: "Acme Corporation".into(),
            contact: "Jordan Lee".into(),
            email: "jordan.lee@example.com".into(),
            phone: "+1 202-555-0148".into(),
            website: "https://example.com/acme".into(),
            vat: "DEMO-US-ACME-001".into(),
            address: "100 Market Street".into(),
            zip: "10001".into(),
            city: "Example City".into(),
            notes: "Demo client — digital products and corporate communications.".into(),
            rate: 85.0,
            currency: "EUR".into(),
            status: "active".into(),
            tags: vec!["web".into(), "corporate".into()],
            favorite: true,
            archived: false,
            workspace_id: Some("demo-acme".into()),
            updated_at: "2026-08-20".into(),
        },
        TrackerClient {
            id: "c2".into(),
            company: "Greenfield Coffee".into(),
            contact: "Casey Morgan".into(),
            email: "casey.morgan@example.com".into(),
            phone: "+1 202-555-0162".into(),
            website: "https://example.com/greenfield".into(),
            vat: "DEMO-US-GREEN-002".into(),
            address: "24 Orchard Lane".into(),
            zip: "10002".into(),
            city: "Example City".into(),
            notes: "Demo client — specialty coffee brand and retail packaging.".into(),
            rate: 70.0,
            currency: "EUR".into(),
            status: "active".into(),
            tags: vec!["branding".into(), "packaging".into()],
            favorite: true,
            archived: false,
            workspace_id: Some("demo-greenfield".into()),
            updated_at: "2026-08-18".into(),
        },
        TrackerClient {
            id: "c3".into(),
            company: "Horizon Labs".into(),
            contact: "Taylor Nguyen".into(),
            email: "taylor.nguyen@example.com".into(),
            phone: "+1 202-555-0186".into(),
            website: "https://example.com/horizon".into(),
            vat: "DEMO-US-HORIZON-003".into(),
            address: "8 Innovation Drive".into(),
            zip: "10003".into(),
            city: "Example City".into(),
            notes: "Demo client — product strategy and launch campaign.".into(),
            rate: 95.0,
            currency: "EUR".into(),
            status: "active".into(),
            tags: vec!["technology".into(), "campaign".into()],
            favorite: false,
            archived: false,
            workspace_id: Some("demo-horizon".into()),
            updated_at: "2026-08-16".into(),
        },
    ]
}

fn seed_projects() -> Vec<TrackerProject> {
    vec![
        TrackerProject {
            id: "p1".into(),
            client_id: "c1".into(),
            client: "Acme Corporation".into(),
            name: "Acme Website Redesign".into(),
            category: "Web Design".into(),
            status: "active".into(),
            progress: 54,
            worked_min: 3120,
            estimated_min: 5760,
            deadline: "2026-09-30".into(),
            accent: "#22c55e".into(),
        },
        TrackerProject {
            id: "p2".into(),
            client_id: "c2".into(),
            client: "Greenfield Coffee".into(),
            name: "Greenfield Brand Identity".into(),
            category: "Branding".into(),
            status: "review".into(),
            progress: 68,
            worked_min: 2040,
            estimated_min: 3000,
            deadline: "2026-09-15".into(),
            accent: "#8b5cf6".into(),
        },
        TrackerProject {
            id: "p3".into(),
            client_id: "c3".into(),
            client: "Horizon Labs".into(),
            name: "Horizon Product Launch".into(),
            category: "Campaign".into(),
            status: "active".into(),
            progress: 39,
            worked_min: 1680,
            estimated_min: 4320,
            deadline: "2026-10-15".into(),
            accent: "#3b82f6".into(),
        },
        TrackerProject {
            id: "p4".into(),
            client_id: "c1".into(),
            client: "Acme Corporation".into(),
            name: "Annual Report 2026".into(),
            category: "Editorial Design".into(),
            status: "active".into(),
            progress: 45,
            worked_min: 1080,
            estimated_min: 2400,
            deadline: "2026-11-20".into(),
            accent: "#f59e0b".into(),
        },
    ]
}

fn seed_tasks() -> Vec<TrackerTask> {
    vec![
        TrackerTask {
            id: "t1".into(),
            project_id: "p1".into(),
            project: "Acme Website Redesign".into(),
            client: "Acme Corporation".into(),
            title: "Homepage wireframes".into(),
            column: "in-progress".into(),
            priority: "high".into(),
            worked_min: 120,
            estimated_min: 300,
            deadline: "2026-08-28".into(),
        },
        TrackerTask {
            id: "t3".into(),
            project_id: "p2".into(),
            project: "Greenfield Brand Identity".into(),
            client: "Greenfield Coffee".into(),
            title: "Packaging color system".into(),
            column: "review".into(),
            priority: "urgent".into(),
            worked_min: 90,
            estimated_min: 180,
            deadline: "2026-08-27".into(),
        },
        TrackerTask {
            id: "t5".into(),
            project_id: "p3".into(),
            project: "Horizon Product Launch".into(),
            client: "Horizon Labs".into(),
            title: "Launch campaign key visual".into(),
            column: "in-progress".into(),
            priority: "high".into(),
            worked_min: 200,
            estimated_min: 420,
            deadline: "2026-09-04".into(),
        },
        TrackerTask {
            id: "t7".into(),
            project_id: "p4".into(),
            project: "Annual Report 2026".into(),
            client: "Acme Corporation".into(),
            title: "Financial highlights spread".into(),
            column: "todo".into(),
            priority: "medium".into(),
            worked_min: 0,
            estimated_min: 240,
            deadline: "2026-09-18".into(),
        },
    ]
}

fn seed_sessions() -> Vec<TrackerSession> {
    vec![
        TrackerSession {
            id: "s1".into(),
            project_id: "p1".into(),
            project: "Acme Website Redesign".into(),
            client: "Acme Corporation".into(),
            date: "2026-08-21".into(),
            start: "09:12:00".into(),
            end: "11:17:00".into(),
            break_min: 0,
            description: "Homepage design system".into(),
            duration_min: 125 * 60,
            cost: 177.08,
            rate: 85.0,
            when: "09:12:00".into(),
            period: "today".into(),
        },
        TrackerSession {
            id: "s3".into(),
            project_id: "p2".into(),
            project: "Greenfield Brand Identity".into(),
            client: "Greenfield Coffee".into(),
            date: "2026-08-20".into(),
            start: "14:20:00".into(),
            end: "15:50:00".into(),
            break_min: 0,
            description: "Packaging identity review".into(),
            duration_min: 90 * 60,
            cost: 105.0,
            rate: 70.0,
            when: "Thu 14:20".into(),
            period: "week".into(),
        },
        TrackerSession {
            id: "s5".into(),
            project_id: "p3".into(),
            project: "Horizon Product Launch".into(),
            client: "Horizon Labs".into(),
            date: "2026-08-19".into(),
            start: "10:00:00".into(),
            end: "12:30:00".into(),
            break_min: 0,
            description: "Launch campaign concept".into(),
            duration_min: 150 * 60,
            cost: 237.5,
            rate: 95.0,
            when: "Wed 10:00".into(),
            period: "week".into(),
        },
        TrackerSession {
            id: "s7".into(),
            project_id: "p4".into(),
            project: "Annual Report 2026".into(),
            client: "Acme Corporation".into(),
            date: "2026-08-18".into(),
            start: "13:30:00".into(),
            end: "15:15:00".into(),
            break_min: 0,
            description: "Editorial grid exploration".into(),
            duration_min: 105 * 60,
            cost: 148.75,
            rate: 85.0,
            when: "Tue 13:30".into(),
            period: "week".into(),
        },
    ]
}
