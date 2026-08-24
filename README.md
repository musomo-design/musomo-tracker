<p align="center">
  <img src="docs/images/musomo-tracker-mark.svg" alt="Musomo Tracker" width="72" height="54" />
</p>

<h1 align="center">Musomo Tracker</h1>

<p align="center">
  A local-first desktop time tracking and project management app for freelancers and independent professionals.
</p>

<p align="center">
  <strong>Version 1.0.20</strong>
</p>

<p align="center">
  <strong>Official website:</strong> <a href="https://tracker.musomo.net/">https://tracker.musomo.net/</a><br />
  <strong>Downloads:</strong> <a href="https://tracker.musomo.net/#download">https://tracker.musomo.net/#download</a>
</p>

<p align="center">
  <a href="https://tracker.musomo.net/">Website</a> ·
  <a href="https://ko-fi.com/musomo">Support Musomo</a> ·
  <a href="https://github.com/musomo-design/musomo-tracker">Repository</a>
</p>

---

Musomo Tracker helps you manage clients, projects, and billable time — without cloud accounts or subscriptions. All data stays on your device in a local SQLite database.

## Main features

- **Clients** — contact details, hourly rates, currencies, archive & favorites
- **Projects** — status, deadlines, progress, detail view with tasks
- **Board** — kanban columns with drag-and-drop
- **Time Tracker** — Start, Pause, Stop with break tracking
- **Mini Timer** — compact always-on-top window synced with the main app
- **Sessions management** — filter, edit, duplicate, move; hourly rate per session
- **Reports PDF / Excel** — Time & Billing reports with HTML preview and export
- **Local-first / SQLite** — no server, no account required
- **Privacy** — data stored locally; no analytics or telemetry ([PRIVACY.md](PRIVACY.md))

## Dashboard

<p align="center">
  <img src="docs/images/dashboards.png" alt="Musomo Tracker dashboard" width="900" />
</p>

Overview metrics, upcoming deadlines, recent activity, and quick access to timer and reports.

## Time tracking

<p align="center">
  <img src="docs/images/timer.png" alt="Musomo Tracker time tracker" width="900" />
</p>

Live timer with project context, pause/break support, manual entry, and Mini Timer link.

## Sessions

<p align="center">
  <img src="docs/images/sessions.png" alt="Musomo Tracker sessions" width="900" />
</p>

View, filter, and edit all time sessions. Set an hourly rate per session and add manual entries.

## Projects

<p align="center">
  <img src="docs/images/projects.png" alt="Musomo Tracker projects" width="900" />
</p>

Projects linked to clients with status, progress, deadlines, and detail views.

## Reports

<p align="center">
  <img src="docs/images/reports.png" alt="Musomo Tracker reports" width="900" />
</p>

Time & Billing reports with filters. Export **PDF** or **Excel**. On macOS, Send Report opens Mail with the attachment — nothing is sent until you confirm.

## Mini Timer

<p align="center">
  <img src="docs/images/mini-timer.png" alt="Musomo Tracker Mini Timer" width="480" />
</p>

Always-on-top window for tracking time while working in other apps. Stays in sync with the main application.

---

## Platforms

| Platform | Status |
|----------|--------|
| **macOS** | Primary target (10.13+). Release builds available as `.app` / `.dmg`. |
| **Windows** | Tauri target configured; **not yet verified**. |

## Installation (macOS)

1. Download the release from [tracker.musomo.net/#download](https://tracker.musomo.net/#download)
2. Open the DMG and drag **Musomo Tracker** to Applications
3. Launch the app — demo data loads on first run (replaceable in Settings)

No internet connection required after installation.

## Local data

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/musomo-tracker/` |
| Windows | `%APPDATA%\musomo-tracker\` |

Includes `tracker.db`, automatic backups in `archives/`, and brand assets in `assets/`.

## Backup & Restore

From **Settings → Data**: clean database (with automatic archive), restore from archive, restore demo data, or refresh from the local database.

## Build from source

For developers with permission to build from this repository:

```bash
git clone https://github.com/musomo-design/musomo-tracker.git
cd musomo-tracker
npm install
npm run build
```

Release artifacts can be staged with:

```bash
bash scripts/stage-dist.sh
# Output: dist/v1.0.20/
```

Version is defined in `package.json` and synchronized via `npm run sync-version`.  
Bundle identifier: `net.musomo.tracker`

## Languages

English, Italiano, Español, Français, Deutsch — system default or override in Settings.

## Links

- **Official website:** https://tracker.musomo.net/
- **Downloads:** https://tracker.musomo.net/#download
- **Support Musomo:** https://ko-fi.com/musomo
- **Repository:** https://github.com/musomo-design/musomo-tracker

## Privacy

Full policy: [PRIVACY.md](PRIVACY.md)

## License

Musomo Tracker is **proprietary software**. Copyright © 2026 Musomo. All rights reserved. See [LICENSE](LICENSE).

Third-party open-source components: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
